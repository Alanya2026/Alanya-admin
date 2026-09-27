import { describe, it, expect } from 'vitest';
import {
  normalize,
  getTier,
  validate,
  isXxyyzztt,
  isPatternReserved,
  validateReservedCandidate,
  formatDisplay,
  formatLiveInput,
  isCompletePhone,
  isAssignableQuery,
} from './alanya-phone';

describe('normalize', () => {
  it('retire tout sauf les chiffres', () => {
    expect(normalize('+33 6 12-34')).toBe('3361234');
    expect(normalize('abc')).toBe('');
  });
  it('gère null/undefined', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('getTier / validate', () => {
  it('3, 4 et 8 chiffres sont les seuls tirages acceptés', () => {
    expect(getTier('123')).toBe(3);
    expect(getTier('1234')).toBe(4);
    expect(getTier('12345678')).toBe(8);
    expect(getTier('12345')).toBeNull();
  });
  it('validate rejette les longueurs hors-tiers', () => {
    expect(validate('12345')).toMatch(/3, 4 ou 8/);
    expect(validate('12a3')).toMatch(/Chiffres uniquement/);
    expect(validate('')).toMatch(/requis/);
    expect(validate('1234')).toBeNull();
  });
});

describe('patterns réservés', () => {
  it('isXxyyzztt ne matche que le format 8 chiffres en paires', () => {
    expect(isXxyyzztt('11223344')).toBe(true);
    expect(isXxyyzztt('12345678')).toBe(false);
    expect(isXxyyzztt('1122334')).toBe(false);
  });
  it('isPatternReserved couvre 3, 4 et XXYYZZTT', () => {
    expect(isPatternReserved('000')).toBe(true);
    expect(isPatternReserved('1234')).toBe(true);
    expect(isPatternReserved('11223344')).toBe(true);
    expect(isPatternReserved('12345678')).toBe(false);
    expect(isPatternReserved('')).toBe(false);
  });
  it('validateReservedCandidate refuse un numéro non-pattern', () => {
    expect(validateReservedCandidate('12345678')).toMatch(/Réservation limitée/);
    expect(validateReservedCandidate('11223344')).toBeNull();
  });
});

describe('formatDisplay', () => {
  it('groupe les 8 chiffres par paires', () => {
    expect(formatDisplay('00482917')).toBe('00 48 29 17');
  });
  it('aligne les anciens 5–7 chiffres sur le schéma 8', () => {
    expect(formatDisplay('123456')).toBe('00 12 34 56');
  });
  it('laisse 3 chiffres tel quel', () => {
    expect(formatDisplay('123')).toBe('123');
  });
});

describe('formatLiveInput', () => {
  it('saisie bornée à 8 chiffres groupés par 2', () => {
    expect(formatLiveInput('12')).toBe('12');
    expect(formatLiveInput('1234')).toBe('12 34');
    expect(formatLiveInput('12345678')).toBe('12 34 56 78');
    expect(formatLiveInput('123456789')).toBe('12 34 56 78');
  });
});

describe('isCompletePhone / isAssignableQuery', () => {
  it('le tri complet valide uniquement les tirages acceptés', () => {
    expect(isCompletePhone('1234')).toBe(true);
    expect(isCompletePhone('12345')).toBe(false);
  });
  it('isAssignableQuery exige une saisie complète', () => {
    expect(isAssignableQuery('')).toBe(false);
    expect(isAssignableQuery('12')).toBe(false);
    expect(isAssignableQuery('1234')).toBe(true);
  });
});
