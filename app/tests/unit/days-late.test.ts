import { describe, expect, it } from 'vitest';
import { daysLate } from '../../src/summary/jobs';

describe('daysLate: whole Athens calendar days between the planned day and today', () => {
  it('counts the days of a late job', () => {
    expect(daysLate('2026-11-20', '2026-11-22')).toBe(2);
    expect(daysLate('2026-10-30', '2026-11-02')).toBe(3);
  });
  it('is undefined (not 0) for a job that is not late or has no readable day', () => {
    expect(daysLate('2026-11-22', '2026-11-22')).toBeUndefined();
    expect(daysLate('2026-11-23', '2026-11-22')).toBeUndefined();
    expect(daysLate('', '2026-11-22')).toBeUndefined();
    expect(daysLate('nonsense', '2026-11-22')).toBeUndefined();
  });
});
