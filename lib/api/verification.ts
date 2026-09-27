/**
 * Dossiers de vérification d'identité — appels d'administration.
 *
 * Réponses en camelCase (`snakeToCamel`, lib/api.ts), SAUF la pièce : un Blob
 * passé à la conversion en ressortirait vidé. Sa requête court-circuite donc
 * `transformResponse`.
 */

import { api } from '@/lib/api';
import type {
  VerificationCount,
  VerificationDetail,
  VerificationQueue,
  VerificationRow,
} from '@/types';

export async function fetchVerifications(queue: VerificationQueue, limit = 100): Promise<VerificationRow[]> {
  const res = await api.get('/admin/verifications', { params: { queue, limit } });
  return (res.data?.requests ?? []) as VerificationRow[];
}

export async function fetchVerificationCount(): Promise<VerificationCount> {
  const res = await api.get('/admin/verifications/count');
  return res.data as VerificationCount;
}

export async function fetchVerification(id: number): Promise<VerificationDetail> {
  const res = await api.get(`/admin/verifications/${id}`);
  return res.data as VerificationDetail;
}

/** La pièce déchiffrée. Chaque appel est journalisé côté serveur. */
export async function fetchVerificationDocument(docId: number): Promise<Blob> {
  const res = await api.get(`/admin/verifications/documents/${docId}`, {
    responseType: 'blob',
    transformResponse: (data) => data,
  });
  return res.data as Blob;
}

export type VerificationDecision = 'approve' | 'refuse' | 'request-document' | 'revoke' | 'reconfirm';

/** Décision sur un dossier. `reason` requis pour refuser, demander une pièce, révoquer. */
export async function decideVerification(
  id: number,
  decision: VerificationDecision,
  reason?: string,
): Promise<VerificationDetail> {
  const res = await api.post(`/admin/verifications/${id}/${decision}`, reason ? { reason } : {});
  return res.data as VerificationDetail;
}
