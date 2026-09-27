import { AdminStats, ActivityEntry } from '@/types';
import { mockStats, mockActivityFeed } from '@/mock/stats';
import { normalizeApiDateRange } from '@/lib/period';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchStats(from?: string, to?: string): Promise<AdminStats> {
  if (USE_MOCK) return mockStats;
  const range = normalizeApiDateRange(from, to);
  const res = await api.get('/admin/stats', { params: range });
  const d = res.data;
  return {
    totalUsers: d.counters?.totalUsers ?? d.totalUsers ?? 0,
    onlineUsers: d.counters?.onlineUsers ?? d.onlineUsers ?? 0,
    bannedUsers: d.counters?.bannedUsers ?? d.bannedUsers ?? 0,
    messagesPeriod: d.counters?.messagesPeriod ?? d.messagesPeriod ?? 0,
    callsPeriod: d.counters?.callsPeriod ?? d.callsPeriod ?? 0,
    statusesPeriod: d.counters?.statusesPeriod ?? d.statusesPeriod ?? 0,
    registrations: (d.registrations || []).map((r: { d?: string; date?: string; n?: number; count?: number }) => ({
      date: r.date || r.d || '',
      count: r.count ?? r.n ?? 0,
    })),
    activity: (d.activity || []).map((r: { d?: string; date?: string; n?: number; count?: number }) => ({
      date: r.date || r.d || '',
      count: r.count ?? r.n ?? 0,
    })),
    topCountries: (d.byCountry || d.topCountries || []).map((c: { country?: string; pays?: string; n?: number; users?: number }) => ({
      pays: c.pays || c.country || '',
      users: c.users ?? c.n ?? 0,
    })),
    topUsers: (d.topUsers || []).map((u: { alanyaID?: number; nom?: string; pseudo?: string; avatar_url?: string; avatarUrl?: string; msgs?: number; messagesSent?: number; calls?: number; callsMade?: number; callsReceived?: number }) => ({
      alanyaID: u.alanyaID ?? 0,
      nom: u.nom || '',
      pseudo: u.pseudo || '',
      avatarUrl: u.avatarUrl || u.avatar_url || '',
      messagesSent: u.messagesSent ?? u.msgs ?? 0,
      callsMade: u.callsMade ?? u.calls ?? 0,
      callsReceived: u.callsReceived ?? 0,
    })),
  };
}

export async function fetchActivityFeed(): Promise<ActivityEntry[]> {
  if (USE_MOCK) return mockActivityFeed;
  const res = await api.get('/admin/activity');
  return res.data as ActivityEntry[];
}
