import { describe, it, expect } from 'vitest';
import { reportReasonLabel, REPORT_REASON_LABELS } from './report-labels';

describe('reportReasonLabel', () => {
  it('traduit une raison connue', () => {
    expect(reportReasonLabel('harassment')).toBe('Harcèlement ou intimidation');
    expect(reportReasonLabel('scam')).toBe('Arnaque ou fraude');
  });
  it('retombe sur la valeur brute pour une raison inconnue', () => {
    expect(reportReasonLabel('custom-xyz')).toBe('custom-xyz');
  });
  it('couvre toutes les raisons du référentiel', () => {
    expect(Object.keys(REPORT_REASON_LABELS)).toContain('hate');
    expect(Object.keys(REPORT_REASON_LABELS)).toContain('spam');
  });
});
