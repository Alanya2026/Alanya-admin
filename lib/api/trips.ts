import { Analytics, TripStats, TripRetention } from '@/types';
import { mockAnalytics } from '@/mock/analytics';
import { mockTripRetention, mockTripStats } from '@/mock/trips';
import { normalizeApiDateRange } from '@/lib/period';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchAnalytics(from?: string, to?: string): Promise<Analytics> {
  if (USE_MOCK) return mockAnalytics;
  const range = normalizeApiDateRange(from, to);
  const res = await api.get('/admin/analytics', { params: range });
  return res.data as Analytics;
}

export async function fetchTripStats(from?: string, to?: string): Promise<TripStats> {
  if (USE_MOCK) return mockTripStats;
  const range = normalizeApiDateRange(from, to);
  const res = await api.get('/admin/trips', { params: range });
  return res.data as TripStats;
}

export async function fetchTripRetention(): Promise<TripRetention> {
  if (USE_MOCK) return mockTripRetention;
  const res = await api.get('/admin/trips/retention');
  return res.data as TripRetention;
}

/**
 * Purge manuelle. `retention` applique la politique tout de suite ; `all`
 * efface la trace de tous les trajets clos. Le serveur ne touche jamais un
 * trajet en cours, quel que soit le scope.
 */
export async function runTripPurge(scope: 'retention' | 'all'): Promise<TripRetention> {
  if (USE_MOCK) return mockTripRetention;
  const res = await api.post('/admin/trips/retention/purge', { scope });
  return res.data as TripRetention;
}
