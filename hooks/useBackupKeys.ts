import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBackupKeyAccess,
  fetchBackupKeyAccessSummary,
  fetchBackupOverview,
  fetchBackupKeyUsage,
  fetchBackupKeys,
  rotateBackupKey,
  retireBackupKey,
  type BackupKeyAccessQuery,
} from '@/lib/mock-data';

/**
 * Journal des délivrances de clé de sauvegarde.
 *
 * La clé de cache porte les filtres : la page complète et l'encart d'une fiche
 * de compte peuvent coexister sans se marcher dessus.
 */
export function useBackupKeyAccess(query: BackupKeyAccessQuery = {}) {
  return useQuery({
    queryKey: ['backup-key-access', query],
    queryFn: () => fetchBackupKeyAccess(query),
    // Un journal se consulte, il ne se surveille pas : le bouton de la page
    // suffit, un rafraîchissement automatique ne ferait que du bruit.
    staleTime: 30_000,
  });
}

export function useBackupKeyAccessSummary(days = 7) {
  return useQuery({
    queryKey: ['backup-key-access-summary', days],
    queryFn: () => fetchBackupKeyAccessSummary(days),
    staleTime: 60_000,
  });
}

/**
 * État des sauvegardes du parc.
 *
 * Lecture seule, et il ne peut pas en être autrement : le serveur ne détient
 * aucune archive — elles vivent sur le Drive de l'inscrit ou dans son
 * téléphone. L'administration constate, elle n'agit pas.
 */
export function useBackupOverview() {
  return useQuery({
    queryKey: ['backup-overview'],
    queryFn: fetchBackupOverview,
    staleTime: 60_000,
  });
}

export function useBackupKeyUsage() {
  return useQuery({
    queryKey: ['backup-key-usage'],
    queryFn: fetchBackupKeyUsage,
    staleTime: 5 * 60_000,
  });
}

/** Versions de clé : lecture. */
export function useBackupKeys() {
  return useQuery({
    queryKey: ['backup-keys'],
    queryFn: fetchBackupKeys,
    staleTime: 60_000,
  });
}

/**
 * Rotation et retrait.
 *
 * Les deux invalident aussi `backup-key-usage` : la répartition des comptes par
 * version change, et l'afficher périmée juste après une rotation serait le pire
 * moment pour mentir.
 */
export function useBackupKeyActions() {
  const qc = useQueryClient();
  const rafraichir = () => {
    qc.invalidateQueries({ queryKey: ['backup-keys'] });
    qc.invalidateQueries({ queryKey: ['backup-key-usage'] });
  };

  const rotation = useMutation({ mutationFn: rotateBackupKey, onSuccess: rafraichir });
  const retrait = useMutation({
    mutationFn: (kid: number) => retireBackupKey(kid),
    onSuccess: rafraichir,
  });
  return { rotation, retrait };
}
