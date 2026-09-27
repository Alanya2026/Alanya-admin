import { describe, it, expect } from 'vitest';
import { resolveAccountBadge, sealPath } from './account-badge';

describe('resolveAccountBadge', () => {
  it('compte personnel vérifié : la coche indigo', () => {
    expect(resolveAccountBadge(0, 2)).toBe('cocheVerifiee');
  });

  it('compte personnel non vérifié, en attente, refusé, révoqué ou expiré : rien', () => {
    for (const status of [0, 1, 3, 4, 5]) {
      expect(resolveAccountBadge(0, status)).toBe('none');
    }
  });

  it('business : panier déclaré, ou vérifié', () => {
    expect(resolveAccountBadge(1, 0)).toBe('panierDeclare');
    expect(resolveAccountBadge(1, 2)).toBe('panierVerifie');
  });

  it("le genre officiel l'emporte sur l'état de vérification", () => {
    expect(resolveAccountBadge(2, 0)).toBe('officiel');
    expect(resolveAccountBadge(2, 2)).toBe('officiel');
  });
});

describe('sealPath', () => {
  it('trace un chemin fermé qui reste dans le viewBox de 24', () => {
    const d = sealPath();
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    const coords = d.replace(/[MLZ]/g, ' ').trim().split(/\s+/).map(Number);
    expect(coords.every((c) => c >= 0 && c <= 24)).toBe(true);
  });
});
