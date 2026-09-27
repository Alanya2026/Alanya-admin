import { api } from '@/lib/api';

/* ── Journal des actions administrateur ─────────────────────────────────── */

/**
 * Le serveur renvoie les colonnes telles quelles ; la conversion vit ici plutôt
 * que dans le contrôleur, comme pour les autres ressources du panneau.
 */
/**
 * Forme brute d'une ressource telle qu'elle arrive de l'API.
 *
 * Les clés sont celles du type final — `api` applique déjà `snakeToCamel` dans
 * son `transformResponse` — mais les valeurs restent `unknown` : un entier peut
 * arriver en chaîne, un booléen en 0/1.
 *
 * L'intérêt est de fermer une porte : avec `Record<string, unknown>`, lire
 * `row.target_type` compilait sans broncher et renvoyait `undefined` à
 * l'exécution. Ici, c'est une erreur de compilation. C'est exactement le bug
 * qui a rendu les écrans Audit et Signalements vides à leur première écriture.
 */
type Wire<T> = { [K in keyof T]?: unknown };

function toAuditEntry(row: Wire<import('@/types').AuditEntry>): import('@/types').AuditEntry {
  // Les clés arrivent déjà en camelCase : `api` applique `snakeToCamel` dans son
  // `transformResponse`. Ne restent ici que les conversions de type.
  return {
    id: Number(row.id),
    action: String(row.action ?? ''),
    route: String(row.route ?? ''),
    targetType: (row.targetType as string) ?? null,
    targetId: row.targetId != null ? String(row.targetId) : null,
    reason: (row.reason as string) ?? null,
    ip: (row.ip as string) ?? null,
    statusCode: Number(row.statusCode ?? 0),
    createdAt: String(row.createdAt ?? ''),
    adminId: row.adminId != null ? Number(row.adminId) : null,
    adminNom: (row.adminNom as string) ?? null,
    adminEmail: (row.adminEmail as string) ?? null,
  };
}

export interface AuditQuery {
  adminId?: number;
  action?: string;
  targetType?: string;
  targetId?: string | number;
  before?: number;
  limit?: number;
}

export async function fetchAudit(query: AuditQuery = {}): Promise<import('@/types').AuditEntry[]> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') params[key] = String(value);
  }
  const res = await api.get('/admin/audit', { params });
  return (Array.isArray(res.data) ? res.data : []).map(toAuditEntry);
}

export async function fetchAuditActions(): Promise<import('@/types').AuditActionCount[]> {
  const res = await api.get('/admin/audit/actions');
  return (Array.isArray(res.data) ? res.data : []).map((row: Wire<import('@/types').AuditActionCount>) => ({
    action: String(row.action ?? ''),
    n: Number(row.n ?? 0),
    derniere: (row.derniere as string) ?? null,
  }));
}
