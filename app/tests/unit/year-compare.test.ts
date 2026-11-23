import { describe, expect, it } from 'vitest';
import { yearCompare } from '../../src/summary/year-compare';

const pl = (id: string, crop: string) => ({ id, farm_id: 'f', crop_id: crop, area_str: '1' });
const h = (id: string, p: string, iso: string, crates: string, extra: Record<string, unknown> = {}) => ({ id, farm_id: 'f', planting_id: p, harvested_at: iso, crates_str: crates, ...extra });
const TODAY = '2026-11-23';

describe('this year against last year: crates per month from the grower\'s own harvest records', () => {
  const plantings = [pl('p1', 'c1'), pl('p2', 'c2')];
  const harvests = [
    h('a', 'p1', '2026-03-10T08:00:00.000Z', '10'), h('b', 'p1', '2026-11-20T08:00:00.000Z', '5'),
    h('c', 'p1', '2025-03-12T08:00:00.000Z', '8'),  h('d', 'p1', '2025-11-30T08:00:00.000Z', '4'), h('e', 'p1', '2025-06-01T08:00:00.000Z', '20'),
    h('x', 'p2', '2026-03-10T08:00:00.000Z', '99'),
  ];
  it('sums whole crates per Athens calendar month for both years; only the chosen crop counts', () => {
    const y = yearCompare('c1', plantings, harvests, TODAY);
    expect(y.thisYear.months[2]).toBe(10); expect(y.thisYear.months[10]).toBe(5);
    expect(y.lastYear.months[2]).toBe(8); expect(y.lastYear.months[5]).toBe(20); expect(y.lastYear.months[10]).toBe(4);
    expect(y.thisYear.total).toBe(15); expect(y.lastYear.total).toBe(32);
  });
  it('compares like with like: last year only up to the same day (23 Nov), so the 30 Nov harvest of last year is not in the comparable total', () => {
    const y = yearCompare('c1', plantings, harvests, TODAY);
    expect(y.lastYear.samePeriod).toBe(28);              // 8 + 20, not the 4 of 30 Nov
    expect(y.thisYear.total).toBe(15);
  });
  it('a harvest on the day itself and one just after Athens midnight fall in the right month', () => {
    const y = yearCompare('c1', [pl('p1', 'c1')], [h('m', 'p1', '2026-02-28T22:30:00.000Z', '3')], TODAY);     // 00:30 on 1 March in Athens
    expect(y.thisYear.months[1]).toBe(0); expect(y.thisYear.months[2]).toBe(3);
  });
  it('unreadable crate numbers and deleted records are counted apart, never as 0; no last-year records = hasLast false', () => {
    const y = yearCompare('c1', plantings, [h('u', 'p1', '2026-03-01T08:00:00.000Z', 'x'), h('d', 'p1', '2026-03-02T08:00:00.000Z', '9', { deleted_at: '2026-03-03T00:00:00Z' })], TODAY);
    expect(y.thisYear.unreadable).toBe(1); expect(y.thisYear.total).toBe(0);
    expect(y.hasLast).toBe(false);
    expect(yearCompare('c1', plantings, harvests, TODAY).hasLast).toBe(true);
  });
});
