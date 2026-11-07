/**
 * Documents sensibles — enquête par empreinte (super-admin, `documents.trace`).
 *
 * La recherche est un POST : le motif voyage dans le corps, jamais dans
 * l'URL. Chaque appel est journalisé côté serveur, empreinte inconnue
 * comprise — d'où l'absence de cache et de nouvel essai automatique.
 */

import { api } from '@/lib/api';
import type { DocumentsSensiblesResume, EmpreinteFiche } from '@/types';

export async function verifierEmpreinte(empreinte: string, reason: string): Promise<EmpreinteFiche> {
  const res = await api.post(
    `/admin/documents-sensibles/empreintes/${encodeURIComponent(empreinte)}/verification`,
    { reason },
  );
  return res.data as EmpreinteFiche;
}

export async function fetchDocumentsSensiblesResume(userId: number): Promise<DocumentsSensiblesResume> {
  const res = await api.get(`/admin/users/${userId}/documents-sensibles`);
  return res.data as DocumentsSensiblesResume;
}
