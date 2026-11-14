import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDocumentsSensiblesResume, verifierEmpreinte } from "@/lib/api/documents-sensibles";

/**
 * Une vérification est une MUTATION, pas une requête : elle écrit au journal
 * et exige un motif. Pas de nouvel essai — un second essai serait une seconde
 * ligne d'audit que l'administrateur n'a pas demandée.
 */
export function useVerifierEmpreinte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empreinte, reason }: { empreinte: string; reason: string }) =>
      verifierEmpreinte(empreinte, reason),
    retry: false,
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-audit"] }),
  });
}

export function useDocumentsSensiblesResume(userId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-user-documents-sensibles", userId],
    queryFn: () => fetchDocumentsSensiblesResume(userId),
    enabled: enabled && Number.isInteger(userId) && userId > 0,
  });
}
