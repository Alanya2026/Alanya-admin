import { describe, it, expect } from 'vitest';
import {
  dateEnquete, formaterEmpreinte, motifValide, normaliserEmpreinte, saisieEmpreinte, tailleLisible,
} from './empreinte';

const HEX = '3f9a0c1e5b7d0000111122223333abcd';

describe('normaliserEmpreinte', () => {
  it('accepte casse, espaces et tirets, comme le serveur', () => {
    expect(normaliserEmpreinte('3F9A 0C1E 5B7D 0000 1111 2222 3333 ABCD')).toBe(HEX);
    expect(normaliserEmpreinte('3f9a-0c1e-5b7d-0000-1111-2222-3333-abcd')).toBe(HEX);
  });
  it('refuse ce qui n\'a pas 32 caractères hexadécimaux', () => {
    expect(normaliserEmpreinte(HEX.slice(1))).toBeNull();
    expect(normaliserEmpreinte(`${HEX.slice(1)}g`)).toBeNull();
    expect(normaliserEmpreinte('')).toBeNull();
    expect(normaliserEmpreinte(null)).toBeNull();
  });
});

describe('mise en forme', () => {
  it('regroupe par quatre, en majuscules', () => {
    expect(formaterEmpreinte(HEX)).toBe('3F9A 0C1E 5B7D 0000 1111 2222 3333 ABCD');
  });
  it('filtre la saisie et la borne à 32 caractères', () => {
    expect(saisieEmpreinte('3f9a-0c1e zz')).toBe('3F9A 0C1E');
    expect(normaliserEmpreinte(saisieEmpreinte(`${HEX}ffff`))).toBe(HEX);
  });
});

describe('motifValide', () => {
  it('exige trois caractères utiles', () => {
    expect(motifValide('  a  b ')).toBe(true);
    expect(motifValide('  ab  ')).toBe(false);
  });
});

describe('affichage', () => {
  it('donne l\'heure UTC à la seconde', () => {
    expect(dateEnquete('2026-11-05T13:32:07.000Z').utc).toBe('13:32:07 UTC');
    expect(dateEnquete(null).locale).toBe('—');
  });
  it('rend une taille lisible', () => {
    expect(tailleLisible(512)).toBe('512 o');
    expect(tailleLisible(2048)).toBe('2 Ko');
    expect(tailleLisible(3 * 1024 * 1024 + 200_000)).toBe('3,2 Mo');
    expect(tailleLisible(null)).toBe('—');
  });
});
