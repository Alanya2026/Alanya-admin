import { api } from '@/lib/api';

/* ── File de modération ─────────────────────────────────────────────────── */

type Wire<T> = { [K in keyof T]?: unknown };

function toReport(row: Wire<import('@/types').Report>): import('@/types').Report {
  // camelCase déjà appliqué par `transformResponse` — cf. toAuditEntry.
  return {
    id: Number(row.id),
    targetType: (row.targetType as 'message' | 'user') ?? 'user',
    targetMsgId: row.targetMsgId != null ? Number(row.targetMsgId) : null,
    targetUserId: row.targetUserId != null ? Number(row.targetUserId) : null,
    reason: String(row.reason ?? ''),
    note: (row.note as string) ?? null,
    state: (row.state as import('@/types').ReportState) ?? 'open',
    createdAt: String(row.createdAt ?? ''),
    reporterId: row.reporterId != null ? Number(row.reporterId) : null,
    reporterNom: (row.reporterNom as string) ?? null,
    targetNom: (row.targetNom as string) ?? null,
    targetExclus: Boolean(row.targetExclus),
    msgSenderId: row.msgSenderId != null ? Number(row.msgSenderId) : null,
    msgSenderNom: (row.msgSenderNom as string) ?? null,
    msgType: row.msgType != null ? Number(row.msgType) : null,
    msgContent: (row.msgContent as string) ?? null,
    msgDeleted: Boolean(row.msgDeleted),
    msgSentAt: (row.msgSentAt as string) ?? null,
    actions: Number(row.actions ?? 0),
  };
}

export interface ReportsParams {
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchReports(
  params: ReportsParams = {},
): Promise<import('@/types').ReportsResponse> {
  const res = await api.get('/admin/reports', {
    params: {
      state: params.state || undefined,
      search: params.search?.trim() || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  // Un serveur d'avant la pagination répond par un tableau nu. L'accepter
  // évite que l'écran s'affiche vide si le panneau est déployé avant le
  // backend — l'ordre de déploiement cesse d'être une condition.
  if (Array.isArray(res.data)) {
    const items = res.data.map(toReport);
    return {
      items,
      total: items.length,
      open: items.filter((r) => r.state === 'open').length,
      page: 1,
      limit: items.length || 20,
    };
  }

  const items = (Array.isArray(res.data?.items) ? res.data.items : []).map(toReport);
  return {
    items,
    total: Number(res.data?.total ?? items.length),
    open: Number(res.data?.open ?? 0),
    page: Number(res.data?.page ?? 1),
    limit: Number(res.data?.limit ?? 20),
  };
}

export async function fetchReportActions(id: number): Promise<import('@/types').ReportAction[]> {
  const res = await api.get(`/admin/reports/${id}/actions`);
  return (Array.isArray(res.data) ? res.data : []).map((row: Wire<import('@/types').ReportAction>) => ({
    id: Number(row.id),
    action: String(row.action ?? ''),
    note: (row.note as string) ?? null,
    createdAt: String(row.createdAt ?? ''),
    adminId: row.adminId != null ? Number(row.adminId) : null,
    adminNom: (row.adminNom as string) ?? null,
  }));
}

export async function postReportAction(id: number, action: string, note?: string): Promise<void> {
  await api.post(`/admin/reports/${id}/actions`, { action, note });
}
