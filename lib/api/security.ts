import { SecuritySettings } from '@/types';
import { api } from '@/lib/api';

export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  const res = await api.get('/admin/security-settings');
  return res.data as SecuritySettings;
}

/**
 * Bascule le verrou d'appareil. Réservé au super-admin côté serveur
 * (`settings.write`) : un appelant sans le droit reçoit un 403.
 *
 * Le serveur garde le réglage en cache 30 secondes, l'effet n'est donc pas
 * instantané sur les instances qui répondent déjà.
 */
export async function updateSecuritySettings(
  payload: { deviceBindingEnabled: boolean },
): Promise<SecuritySettings> {
  const res = await api.put('/admin/security-settings', payload);
  return res.data as SecuritySettings;
}
