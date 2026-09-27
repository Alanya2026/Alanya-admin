import { Pays, UsersResponse, UserDetail, UserActivity, LoginEntry } from '@/types';
import { mockUsersResponse, mockUserDetail, mockUserActivity, mockLoginHistory } from '@/mock/users';
import { mockCountries } from '@/mock/countries';
import { buildUsersApiParams, UsersApiParams } from '@/lib/api-params';
import { api } from '@/lib/api';
import { USE_MOCK } from '@/lib/mock';

export async function fetchCountries(): Promise<Pays[]> {
  if (USE_MOCK) return mockCountries;
  const res = await api.get('/pays');
  return (res.data || []) as Pays[];
}

export async function fetchUsers(params: UsersApiParams): Promise<UsersResponse> {
  if (USE_MOCK) return mockUsersResponse(params);
  // Le backend lit les filtres avec les noms de colonnes MySQL : idPays
  // (camelCase) mais account_type (snake_case). Voir buildUsersApiParams.
  const apiParams = buildUsersApiParams(params);
  const res = await api.get('/admin/users', { params: apiParams });
  return res.data;
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  if (USE_MOCK) {
    return { ...mockUserDetail, alanyaID: id };
  }
  const res = await api.get(`/admin/users/${id}`);
  return res.data;
}

export async function fetchUserActivity(id: number): Promise<UserActivity> {
  if (USE_MOCK) return mockUserActivity;
  const res = await api.get(`/admin/users/${id}/activity`);
  return res.data;
}

export async function fetchUserLogins(id: number): Promise<LoginEntry[]> {
  if (USE_MOCK) return mockLoginHistory;
  const res = await api.get(`/admin/users/${id}/logins`);
  return res.data;
}

export async function banUser(id: number, reason?: string): Promise<void> {
  if (USE_MOCK) return;
  await api.post(`/admin/users/${id}/ban`, { reason });
}

export async function unbanUser(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/users/${id}/ban`);
}

export async function setUserRole(id: number, typeCompte: number): Promise<void> {
  if (USE_MOCK) return;
  await api.put(`/admin/users/${id}/role`, { type_compte: typeCompte });
}

export async function deleteUser(id: number): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/users/${id}`);
}

export async function createUser(payload: import('@/types').CreateUserPayload): Promise<UserDetail> {
  if (USE_MOCK) {
    return {
      ...mockUserDetail,
      nom: payload.nom,
      pseudo: payload.pseudo,
      alanyaPhone: payload.alanyaPhone || '12345678',
      email: payload.email || '',
    };
  }
  const res = await api.post('/admin/users', {
    nom: payload.nom,
    pseudo: payload.pseudo,
    password: payload.password,
    email: payload.email,
    alanyaPhone: payload.alanyaPhone,
    generateLength: payload.generateLength,
    idPays: payload.idPays,
    avatarGender: payload.avatarGender,
    type_compte: payload.type_compte,
    account_type: payload.account_type,
  });
  return res.data;
}

/**
 * Socle de compte. Réservé au super-admin côté serveur, qui refuse en 409
 * de donner un genre business/officiel à un compte disposant de droits
 * d'administration.
 */
export async function setUserSocle(
  id: number,
  payload: import('@/types').SetUserSoclePayload,
): Promise<void> {
  if (USE_MOCK) return;
  await api.put(`/admin/users/${id}/socle`, payload);
}

export async function updateUserPhone(id: number, alanyaPhone: string): Promise<void> {
  if (USE_MOCK) return;
  await api.put(`/admin/users/${id}/phone`, { alanyaPhone });
}

export async function fetchUserPhoneHistory(id: number): Promise<import('@/types').UserPhoneHistoryResponse> {
  if (USE_MOCK) return { quarantineDays: 90, pendingCredit: null, history: [] };
  const res = await api.get(`/admin/users/${id}/phone-history`);
  return res.data;
}

export async function fetchReservedAlanyaPhones(
  params: import('@/types').ReservedAlanyaPhonesParams = {},
): Promise<import('@/types').PaginatedReservedAlanyaPhones> {
  const mockItems: import('@/types').ReservedAlanyaPhone[] = [
    { id: 1, phoneCanonical: '000', label: 'Réservé 3 ch.', createdBy: null, createdAt: new Date().toISOString(), isUsed: false },
    { id: 2, phoneCanonical: '0000', label: 'Réservé 4 ch.', createdBy: null, createdAt: new Date().toISOString(), isUsed: true, usedByAlanyaId: 4, usedByNom: 'Sophie L.', usedByPseudo: 'sophiel' },
    { id: 3, phoneCanonical: '00000000', label: 'Réservé 8 ch.', createdBy: null, createdAt: new Date().toISOString(), isUsed: false },
  ];

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  if (USE_MOCK) {
    let filtered = [...mockItems];
    const q = params.q?.trim();
    if (q) {
      const digits = q.replace(/\D/g, '');
      filtered = filtered.filter((item) =>
        digits
          ? item.phoneCanonical.startsWith(digits)
          : item.label.toLowerCase().includes(q.toLowerCase()),
      );
    }
    if (params.available === '1') filtered = filtered.filter((item) => !item.isUsed);
    if (params.available === '0') filtered = filtered.filter((item) => item.isUsed);
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  const res = await api.get('/admin/reserved-alanya-phones', { params });
  const data = res.data || {};

  // Ancienne API (tableau brut) : ne pas charger 100k+ lignes d'un coup
  if (Array.isArray(data)) {
    const start = (page - 1) * limit;
    const slice = data.slice(start, start + limit);
    return {
      items: slice.map((r: Record<string, unknown>) => mapReservedRow(r)),
      total: data.length,
      page,
      limit,
    };
  }

  const rows = data.items || [];

  return {
    items: rows.map((r: Record<string, unknown>) => mapReservedRow(r)),
    total: Number(data.total ?? rows.length),
    page: Number(data.page ?? page),
    limit: Number(data.limit ?? limit),
    patternSuggestion: mapPatternSuggestion(data.pattern_suggestion),
  };
}

function mapPatternSuggestion(
  raw: unknown,
): import('@/types').PatternSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const phone =
    (r.phone_canonical as string) || (r.phoneCanonical as string) || '';
  if (!phone) return null;
  return {
    phoneCanonical: phone,
    label: (r.label as string) || 'Pattern réservé',
    source: 'pattern',
    isUsed: Boolean(r.isUsed ?? r.is_used),
    assignable: Boolean(r.assignable ?? !r.is_used),
  };
}

export async function checkAssignablePhone(
  phone: string,
): Promise<import('@/types').AssignablePhoneCheck> {
  if (USE_MOCK) {
    const canonical = phone.replace(/\D/g, '');
    const isPattern =
      canonical.length === 3 ||
      canonical.length === 4 ||
      (canonical.length === 8 &&
        canonical[0] === canonical[1] &&
        canonical[2] === canonical[3] &&
        canonical[4] === canonical[5] &&
        canonical[6] === canonical[7]);
    return {
      phoneCanonical: canonical,
      tier: canonical.length,
      isPatternReserved: isPattern,
      inReservedTable: false,
      isTaken: false,
      assignable: true,
      reason: null,
      source: isPattern ? 'pattern' : 'standard',
      hint: isPattern ? 'Pattern réservé — attribution directe autorisée' : null,
    };
  }

  const res = await api.get('/admin/alanya-phones/check-assignable', {
    params: { phone },
  });
  const d = res.data || {};
  return {
    phoneCanonical: d.phone_canonical as string,
    tier: Number(d.tier),
    isPatternReserved: Boolean(d.is_pattern_reserved),
    inReservedTable: Boolean(d.in_reserved_table),
    isTaken: Boolean(d.is_taken),
    assignable: Boolean(d.assignable),
    reason: (d.reason as string) ?? null,
    source: d.source as 'pattern' | 'table' | 'standard',
    hint: (d.hint as string) ?? null,
  };
}

function mapReservedRow(r: Record<string, unknown>): import('@/types').ReservedAlanyaPhone {
  return {
      id: r.id as number,
      phoneCanonical: (r.phone_canonical as string) || (r.phoneCanonical as string) || '',
      label: r.label as string,
      createdBy: (r.created_by as number) ?? null,
      createdAt: (r.created_at as string) || '',
      createdByNom: (r.created_by_nom as string) ?? null,
      isUsed: Boolean(r.isUsed ?? r.is_used),
      usedByAlanyaId: (r.usedByAlanyaId as number) ?? (r.used_by_alanya_id as number) ?? null,
      usedByNom: (r.usedByNom as string) ?? (r.used_by_nom as string) ?? null,
      usedByPseudo: (r.usedByPseudo as string) ?? (r.used_by_pseudo as string) ?? null,
  };
}

export async function addReservedAlanyaPhone(phone: string, label: string): Promise<void> {
  if (USE_MOCK) return;
  await api.post('/admin/reserved-alanya-phones', { phone, label });
}

export async function removeReservedAlanyaPhone(phone: string): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/admin/reserved-alanya-phones/${encodeURIComponent(phone)}`);
}
