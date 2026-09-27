import { describe, it, expect } from 'vitest';
import { mockUsersResponse } from './users';
import { buildUsersApiParams } from '@/lib/api-params';

describe('mockUsersResponse', () => {
  it('filtre par pays (idPays)', () => {
    const out = mockUsersResponse({ idPays: '2' });
    expect(out.total).toBeGreaterThan(0);
    expect(out.items.every((u) => String(u.idPays) === '2')).toBe(true);
  });

  it('filtre par statut banni', () => {
    const out = mockUsersResponse({ status: 'banned' });
    expect(out.items.every((u) => u.exclus)).toBe(true);
  });

  it('filtre par type de compte', () => {
    const out = mockUsersResponse({ accountType: '0' });
    expect(out.items.every((u) => String(u.accountType ?? 0) === '0')).toBe(true);
  });

  it('filtre par rôle (type_compte)', () => {
    const out = mockUsersResponse({ typeCompte: '1' });
    expect(out.total).toBeGreaterThan(0);
    expect(out.items.every((u) => String(u.typeCompte) === '1')).toBe(true);
  });

  it('pagine correctement', () => {
    const all = mockUsersResponse({}).items;
    const page1 = mockUsersResponse({ page: 1, limit: 3 }).items;
    const page2 = mockUsersResponse({ page: 2, limit: 3 }).items;
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
    expect(page1[0].alanyaID).not.toBe(page2[0].alanyaID);
    expect(page1.concat(page2).length).toBeLessThanOrEqual(all.length);
  });

  it('filtre par plage de dates (bornes inclusives, createdAt)', () => {
    const fromMs = Date.parse('2025-01-01T00:00:00Z');
    const toMs = Date.parse('2025-12-31T23:59:59Z');
    const out = mockUsersResponse({ from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' });
    expect(out.items.every((u) => {
      const t = u.createdAt ? new Date(u.createdAt).getTime() : 0;
      return t >= fromMs && t <= toMs;
    })).toBe(true);
    // L'utilisateur inscrit en décembre 2024 est exclu de 2025.
    expect(out.items.some((u) => u.createdAt?.startsWith('2024'))).toBe(false);
  });

  it('traduit accountType → account_type comme le backend (contrat partagé)', () => {
    expect(buildUsersApiParams({ accountType: '1' }).account_type).toBe('1');
    expect(buildUsersApiParams({ typeCompte: '2' }).type_compte).toBe('2');
  });
});
