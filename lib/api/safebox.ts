import { SafeboxAdmin, SafeboxSettingsPayload } from '@/types';
import { api } from '@/lib/api';

/** Volume stocké, coffres, plus gros consommateurs, partages et réglages. */
export async function fetchSafeboxAdmin(): Promise<SafeboxAdmin> {
  const res = await api.get('/admin/safebox');
  return res.data as SafeboxAdmin;
}

/** Super-admin. Rend la page complète, réglages à jour. */
export async function updateSafeboxSettings(payload: SafeboxSettingsPayload): Promise<SafeboxAdmin> {
  const res = await api.put('/admin/safebox/settings', payload);
  return res.data as SafeboxAdmin;
}
