import { Broadcast, BroadcastsResponse, BroadcastFormData, BroadcastEstimateResult, Ville } from '@/types';
import { normalizeApiDateRange } from '@/lib/period';
import { toBroadcastApiPayload } from '@/lib/broadcast-payload';
import { api } from '@/lib/api';

export async function fetchBroadcasts(params: {
  page?: number;
  limit?: number;
  search?: string;
  kind?: string;
  type?: string;
  status?: string;
  idPays?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
} = {}): Promise<BroadcastsResponse> {
  const { from, to, ...rest } = params;
  const apiParams: Record<string, string | number | undefined> = { ...rest };
  if (from || to) {
    const range = normalizeApiDateRange(from, to);
    apiParams.from = range.from;
    apiParams.to = range.to;
  }
  const res = await api.get('/admin/broadcasts', { params: apiParams });
  return res.data as BroadcastsResponse;
}

export async function fetchBroadcast(id: number): Promise<Broadcast> {
  const res = await api.get(`/admin/broadcasts/${id}`);
  return res.data as Broadcast;
}

export async function estimateBroadcast(criteria: import('@/types').BroadcastCriteria): Promise<BroadcastEstimateResult> {
  const res = await api.post('/admin/broadcasts/estimate', { criteria });
  return res.data as BroadcastEstimateResult;
}

export async function createBroadcast(data: BroadcastFormData): Promise<Broadcast | { scheduled: true; clientId: string; scheduledAt: string; estimate: number }> {
  const res = await api.post('/admin/broadcasts', toBroadcastApiPayload(data));
  return res.data;
}

export async function cancelScheduledBroadcast(jobId: number): Promise<void> {
  await api.delete(`/admin/broadcasts/scheduled/${jobId}`);
}

export async function fetchVilles(idPays: number, search = ''): Promise<Ville[]> {
  const res = await api.get('/admin/villes', { params: { idPays, search } });
  return (res.data?.items || []) as Ville[];
}

/**
 * Le compte officiel est unique : on lit l'unique, on ne liste pas.
 * Renvoie null tant qu'il n'a pas été créé — les écrans s'en servent pour
 * afficher un état vide plutôt qu'un formulaire qui échouerait à l'envoi.
 */
export async function fetchOfficialAccount(): Promise<import('@/types').User | null> {
  const res = await api.get('/admin/official-account');
  return (res.data || null) as import('@/types').User | null;
}

/** Création sans aucune saisie : l'identité est imposée par le serveur. */
export async function createOfficialAccount(): Promise<import('@/types').User> {
  const res = await api.post('/admin/official-account');
  return res.data as import('@/types').User;
}
