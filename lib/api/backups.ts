/**
 * Sauvegardes du parc et clés de sauvegarde (pages /backups et /backup-keys).
 *
 * Repris tel quel de `lib/mock-data.ts` (branche Alfred) lors de la fusion
 * avec main, qui a découpé ce fichier par domaine.
 */
import { api } from '@/lib/api';

// Forme brute d'une réponse, avant conversion — cf. lib/api/audit.ts.
type Wire<T> = { [K in keyof T]?: unknown };

/* ── Sauvegardes du parc ────────────────────────────────────────────────── */

export async function fetchBackupOverview(): Promise<import('@/types').BackupOverview> {
  const res = await api.get('/admin/backup/overview');
  const d = res.data ?? {};
  return {
    staleDays: Number(d.staleDays ?? 30),
    comptes: Number(d.comptes ?? 0),
    avecSauvegarde: Number(d.avecSauvegarde ?? 0),
    recentes: Number(d.recentes ?? 0),
    perimees: Number(d.perimees ?? 0),
    jamais: Number(d.jamais ?? 0),
    octetsTotal: Number(d.octetsTotal ?? 0),
    derniere: (d.derniere as string) ?? null,
    couverture: Number(d.couverture ?? 0),
  };
}

export async function fetchBackupKeyUsage(): Promise<import('@/types').BackupKeyUsage[]> {
  const res = await api.get('/admin/backup/key-usage');
  return (Array.isArray(res.data) ? res.data : []).map((r: Record<string, unknown>) => ({
    kid: Number(r.kid ?? 0),
    comptes: Number(r.comptes ?? 0),
    derniere: (r.derniere as string) ?? null,
  }));
}

/* ── Versions de clé ────────────────────────────────────────────────────── */

export async function fetchBackupKeys(): Promise<import('@/types').BackupKeyState> {
  const res = await api.get('/admin/backup/keys');
  const d = res.data ?? {};
  return {
    versions: (Array.isArray(d.versions) ? d.versions : []).map(
      (v: Record<string, unknown>) => ({
        kid: Number(v.kid ?? 0),
        createdAt: String(v.createdAt ?? ''),
        retiredAt: (v.retiredAt as string) ?? null,
        active: Boolean(v.active),
        placeholder: Boolean(v.placeholder),
        comptes: Number(v.comptes ?? 0),
      }),
    ),
    courante: d.courante != null ? Number(d.courante) : null,
    utilisable: Boolean(d.utilisable),
  };
}

/** Engendre une version et retire les précédentes. Le secret ne transite pas. */
export async function rotateBackupKey(): Promise<void> {
  await api.post('/admin/backup/keys');
}

export async function retireBackupKey(kid: number): Promise<void> {
  await api.post(`/admin/backup/keys/${kid}/retire`);
}

/* ── Clés de sauvegarde ─────────────────────────────────────────────────── */

export interface BackupKeyAccessQuery {
  alanyaId?: number;
  outcome?: 'servie' | 'refusee';
  since?: string;
  limit?: number;
}

function toBackupKeyAccess(
  row: Wire<import('@/types').BackupKeyAccess>,
): import('@/types').BackupKeyAccess {
  // camelCase déjà appliqué par `transformResponse` — cf. toAuditEntry.
  return {
    id: Number(row.id),
    alanyaId: Number(row.alanyaId ?? 0),
    kid: row.kid != null ? Number(row.kid) : null,
    outcome: (row.outcome as 'servie' | 'refusee') ?? 'servie',
    reason: (row.reason as string) ?? null,
    ip: (row.ip as string) ?? null,
    deviceId: (row.deviceId as string) ?? null,
    userAgent: (row.userAgent as string) ?? null,
    createdAt: String(row.createdAt ?? ''),
    compteNom: (row.compteNom as string) ?? null,
    comptePhone: (row.comptePhone as string) ?? null,
  };
}

export async function fetchBackupKeyAccess(
  query: BackupKeyAccessQuery = {},
): Promise<import('@/types').BackupKeyAccess[]> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') params[key] = String(value);
  }
  const res = await api.get('/admin/backup/key-access', { params });
  return (Array.isArray(res.data) ? res.data : []).map(toBackupKeyAccess);
}

export async function fetchBackupKeyAccessSummary(
  days = 7,
): Promise<import('@/types').BackupKeyAccessSummary> {
  const res = await api.get('/admin/backup/key-access/summary', {
    params: { days: String(days) },
  });
  const d = res.data ?? {};
  return {
    days: Number(d.days ?? days),
    total: Number(d.total ?? 0),
    refus: Number(d.refus ?? 0),
    comptes: Number(d.comptes ?? 0),
    adresses: Number(d.adresses ?? 0),
    derniere: (d.derniere as string) ?? null,
  };
}
