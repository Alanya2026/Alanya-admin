import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSafeboxAdmin, updateSafeboxSettings } from "@/lib/api/safebox";
import type { SafeboxSettingsPayload } from "@/types";

const KEY = ["admin-safebox"];

export function useSafeboxAdmin() {
  return useQuery({ queryKey: KEY, queryFn: fetchSafeboxAdmin });
}

export function useUpdateSafeboxSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SafeboxSettingsPayload) => updateSafeboxSettings(payload),
    // Le serveur rend la page entière : pas de second aller-retour.
    onSuccess: (page) => qc.setQueryData(KEY, page),
  });
}
