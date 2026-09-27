import { ServiceHealth } from '@/types';
import { api } from '@/lib/api';

/**
 * État du service : file de jobs, purges, Redis, pool MySQL.
 *
 * Complément de la supervision externe, pas son remplaçant. Une sonde qui
 * interroge `/health` sait dire si le serveur répond ; elle ne saura jamais
 * qu'un job de purge échoue chaque nuit depuis une semaine.
 */
export async function fetchServiceHealth(): Promise<ServiceHealth> {
  const res = await api.get('/admin/health');
  return res.data as ServiceHealth;
}
