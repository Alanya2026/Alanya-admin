import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReportActions, fetchReports, postReportAction, type ReportsParams } from '@/lib/mock-data';

/**
 * File de modération.
 *
 * Rafraîchie plus souvent que le reste du panneau : c'est le seul écran où
 * l'inaction a un coût pour quelqu'un d'autre.
 *
 * `keepPreviousData` parce que la recherche part à chaque frappe : sans lui, la
 * file clignoterait entre le squelette et les résultats à chaque caractère.
 */
export function useReports(params: ReportsParams = {}) {
  return useQuery({
    queryKey: ['admin-reports', params],
    queryFn: () => fetchReports(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/**
 * La tête de la file ouverte, servie au dashboard.
 *
 * Même famille de clé que la file complète : une décision prise sur l'écran
 * dédié invalide le widget, et l'inverse. Le serveur renvoie aussi `open`,
 * le décompte total — plus fiable que `items.length`, plafonné au `limit`.
 */
export function useOpenReports(limit = 4) {
  return useQuery({
    queryKey: ['admin-reports', { state: 'open', page: 1, limit }],
    queryFn: () => fetchReports({ state: 'open', page: 1, limit }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useReportActions(id: number | null) {
  return useQuery({
    queryKey: ['admin-report-actions', id],
    queryFn: () => fetchReportActions(id as number),
    enabled: id != null,
  });
}

export function useHandleReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note?: string }) =>
      postReportAction(id, action, note),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-report-actions', id] });
      // Une décision de modération est aussi une action d'administration : elle
      // apparaît dans le journal, qui doit se rafraîchir avec.
      qc.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}
