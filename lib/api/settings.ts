import { AppSettings } from '@/types';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

const DEFAULT_SETTINGS: AppSettings = {
  maintenance: false,
  appName: 'Alanya',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
};

export async function fetchSettings(): Promise<AppSettings> {
  if (USE_MOCK) return DEFAULT_SETTINGS;
  const res = await api.get('/admin/settings');
  return res.data as AppSettings;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (USE_MOCK) return { ...DEFAULT_SETTINGS, ...patch };
  const res = await api.put('/admin/settings', patch);
  return res.data as AppSettings;
}
