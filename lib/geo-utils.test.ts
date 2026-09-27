import { describe, it, expect } from 'vitest';
import {
  getCountryGeo,
  getColorForCount,
  getRadiusForCount,
  matchGeoFeature,
  computeRegionStats,
  getFlag,
} from './geo-utils';

describe('getCountryGeo', () => {
  it('résout alias non-canoniques et casse différente', () => {
    expect(getCountryGeo('senegal')!.name).toBe('Sénégal');
    expect(getCountryGeo("cote d'ivoire")!.name).toBe("Côte d'Ivoire");
    expect(getCountryGeo('USA')!.name).toBe('États-Unis');
  });
  it('retourne undefined pour un inconnu', () => {
    expect(getCountryGeo('Atlantide')).toBeUndefined();
  });
});

describe('getColorForCount / getRadiusForCount', () => {
  it('débordement sécurisé quand max=0', () => {
    expect(getColorForCount(0, 0)).toBe('#1e1b4b');
    expect(getRadiusForCount(0, 0)).toBe(4);
  });
  it('la pleine échelle retourne la couleur la plus claire', () => {
    expect(getColorForCount(10, 10)).toMatch(/^rgb\(/);
  });
  it('rayon proportionnel au ratio', () => {
    expect(getRadiusForCount(0, 10)).toBe(4);
    expect(getRadiusForCount(10, 10)).toBe(22);
  });
});

describe('matchGeoFeature', () => {
  it('priorité ISO_A2 → compteur canonique', () => {
    const out = matchGeoFeature({ ISO_A2: 'CI', NAME: 'Ivory Coast' }, { "Côte d'Ivoire": 5 });
    expect(out.count).toBe(5);
    expect(out.displayName).toBe("Côte d'Ivoire");
  });
  it('NAME_FR direct', () => {
    const out = matchGeoFeature({ NAME_FR: 'Cameroun', NAME: 'Cameroon' }, { Cameroun: 3 });
    expect(out.count).toBe(3);
  });
  it('retombe sur 0 sans correspondance', () => {
    const out = matchGeoFeature({ NAME: 'Atlantide' }, { France: 1 });
    expect(out.count).toBe(0);
  });
});

describe('computeRegionStats', () => {
  it('regroupe par région et trie décroissant', () => {
    const stats = computeRegionStats({ France: 10, Maroc: 5, Canada: 5 });
    expect(stats[0].region).toBe('Europe');
    // Afrique et Amériques à égalité (5) : l'ordre d'insertion est conservé.
    expect(stats.map((s) => s.region)).toEqual(['Europe', 'Afrique', 'Amériques']);
    expect(stats[0].percentage).toBe(50);
  });
  it('exclut les régions à 0', () => {
    const stats = computeRegionStats({ France: 10 });
    expect(stats.every((s) => s.total > 0)).toBe(true);
  });
});

describe('getFlag', () => {
  it('renvoie le drapeau connu, sinon le globe', () => {
    expect(getFlag('France')).toBe('🇫🇷');
    expect(getFlag('Cameroun')).toBe('🇨🇲');
    expect(getFlag('Atlantide')).toBe('🌍');
  });
});
