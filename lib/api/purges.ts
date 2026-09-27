import { PurgeSetting, PurgeRun } from '@/types';
import { api } from '@/lib/api';

export async function fetchPurges(): Promise<PurgeSetting[]> {
  const res = await api.get('/admin/purges');
  return (res.data?.purges || []) as PurgeSetting[];
}

/** Active/désactive une purge, ou change ses durées de rétention. */
export async function updatePurge(
  name: string,
  payload: { enabled?: boolean; overrides?: Record<string, number | null> },
): Promise<PurgeSetting> {
  const res = await api.put(`/admin/purges/${name}`, payload);
  return res.data as PurgeSetting;
}

/**
 * Exécution immédiate. Volontairement indépendante de l'interrupteur : garder
 * la main pour purger ponctuellement tout en laissant le balayage automatique
 * coupé est l'usage attendu.
 */
export async function runPurgeNow(name: string): Promise<{ ok: boolean; runs: PurgeRun[] }> {
  const res = await api.post(`/admin/purges/${name}/run`, {});
  return res.data as { ok: boolean; runs: PurgeRun[] };
}
