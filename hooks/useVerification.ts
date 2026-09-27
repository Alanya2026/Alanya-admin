import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideVerification,
  fetchVerification,
  fetchVerificationCount,
  fetchVerifications,
  type VerificationDecision,
} from "@/lib/api/verification";
import type { VerificationQueue } from "@/types";

const LIST = ["admin-verifications"];
const COUNT = ["admin-verification-count"];
const detailKey = (id: number) => ["admin-verification", id];

export function useVerifications(queue: VerificationQueue) {
  return useQuery({ queryKey: [...LIST, queue], queryFn: () => fetchVerifications(queue) });
}

/** Le compteur du menu : relu chaque minute, sans bloquer la navigation. */
export function useVerificationCount(enabled = true) {
  return useQuery({
    queryKey: COUNT,
    queryFn: fetchVerificationCount,
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useVerification(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => fetchVerification(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** La réponse porte le dossier à jour : posé en cache ; files, compteur et fiche relus. */
export function useVerificationDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: number; decision: VerificationDecision; reason?: string }) =>
      decideVerification(id, decision, reason),
    onSuccess: (data, { id }) => {
      qc.setQueryData(detailKey(id), data);
      qc.invalidateQueries({ queryKey: LIST });
      qc.invalidateQueries({ queryKey: COUNT });
      qc.invalidateQueries({ queryKey: ["admin-user-detail"] });
      qc.invalidateQueries({ queryKey: ["admin-user-billing"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });
}
