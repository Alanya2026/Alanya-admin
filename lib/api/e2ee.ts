import { api } from '@/lib/api';

/** Interrupteur du chiffrement de bout en bout (`/api/admin/e2ee-settings`). */
export interface E2eeSettings {
  /** Cran 1 : les appareils de la cohorte publient leurs clés. */
  enrolEnabled: boolean;
  /** Cran 2 : les conversations de la cohorte passent en chiffré. */
  activateEnabled: boolean;
  /** Part de tous les comptes, de 0 à 100. */
  cohortPercent: number;
  /** Comptes inclus quel que soit le pourcentage. */
  cohortIds: number[];
  updatedAt: string;
}

export async function fetchE2eeSettings(): Promise<E2eeSettings> {
  const res = await api.get('/admin/e2ee-settings');
  return res.data as E2eeSettings;
}

/**
 * Mise à jour partielle, réservée au super-admin (`settings.write`). Le
 * serveur garde le réglage en cache 30 secondes.
 */
export async function updateE2eeSettings(
  payload: Partial<Omit<E2eeSettings, 'updatedAt'>>,
): Promise<E2eeSettings> {
  const res = await api.put('/admin/e2ee-settings', payload);
  return res.data as E2eeSettings;
}
