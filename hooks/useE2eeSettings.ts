import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchE2eeSettings, updateE2eeSettings, type E2eeSettings } from "@/lib/api/e2ee";

const KEY = ["admin-e2ee-settings"];

export function useE2eeSettings() {
  return useQuery({ queryKey: KEY, queryFn: fetchE2eeSettings });
}

/** La réponse porte l'état complet : posé en cache, sans relecture. */
export function useUpdateE2eeSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateE2eeSettings,
    onSuccess: (data) => {
      qc.setQueryData<E2eeSettings>(KEY, data);
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });
}
