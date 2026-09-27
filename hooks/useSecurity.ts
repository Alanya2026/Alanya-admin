import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSecuritySettings, updateSecuritySettings } from "@/lib/api/security";
import type { SecuritySettings } from "@/types";

const KEY = ["admin-security-settings"];

export function useSecuritySettings() {
  return useQuery({ queryKey: KEY, queryFn: fetchSecuritySettings });
}

/**
 * La réponse porte l'état complet : on le pose en cache plutôt que de relire —
 * et l'activité admin, qui vient d'enregistrer la bascule, est rafraîchie.
 */
export function useUpdateSecuritySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceBindingEnabled: boolean) =>
      updateSecuritySettings({ deviceBindingEnabled }),
    onSuccess: (data) => {
      qc.setQueryData<SecuritySettings>(KEY, data);
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });
}
