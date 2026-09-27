import { describe, it, expect } from 'vitest';
import { monthlyEquivalent, monthsOffered, formatFcfa, periodSuffix, referencePlan } from './plan-pricing';

const MENSUEL = { durationMonths: 1, priceAmount: 250 };
const ANNUEL = { durationMonths: 12, priceAmount: 2000 };

describe('monthlyEquivalent', () => {
  it("l'annuel à 2 000 F revient à 167 F par mois", () => {
    expect(monthlyEquivalent(ANNUEL)).toBe(167);
  });
  it('le mensuel reste le mensuel', () => {
    expect(monthlyEquivalent(MENSUEL)).toBe(250);
  });
});

describe('monthsOffered', () => {
  it("l'annuel offre 4 mois par rapport au mensuel", () => {
    expect(monthsOffered(ANNUEL, MENSUEL)).toBe(4);
  });
  it('rien d’offert pour le mensuel lui-même', () => {
    expect(monthsOffered(MENSUEL, MENSUEL)).toBe(0);
  });
  it("rien d'offert si le plan n'est pas plus avantageux", () => {
    expect(monthsOffered({ durationMonths: 12, priceAmount: 3000 }, MENSUEL)).toBe(0);
  });
  it('rien sans plan de référence', () => {
    expect(monthsOffered(ANNUEL, null)).toBe(0);
  });
  it('suit un changement de prix', () => {
    expect(monthsOffered({ durationMonths: 12, priceAmount: 2500 }, MENSUEL)).toBe(2);
  });
});

describe('formatage', () => {
  it('sépare les milliers à la française', () => {
    expect(formatFcfa(2000).replace(/\s/g, ' ')).toBe('2 000 F');
  });
  it('nomme la durée', () => {
    expect(periodSuffix(1)).toBe('/ mois');
    expect(periodSuffix(12)).toBe('/ an');
    expect(periodSuffix(3)).toBe('/ 3 mois');
  });
});

describe('referencePlan', () => {
  it('prend le mensuel actif', () => {
    const plans = [
      { ...ANNUEL, isActive: 1 },
      { ...MENSUEL, isActive: 0 },
      { durationMonths: 1, priceAmount: 300, isActive: 1 },
    ];
    expect(referencePlan(plans)?.priceAmount).toBe(300);
  });
});
