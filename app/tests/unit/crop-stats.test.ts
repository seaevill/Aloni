import { describe, expect, it } from 'vitest';
import { cropStats, harvestPace, isFew, MIN_RECORDS, recentPace } from '../../src/summary/crop-stats';

const planting = (id: string, area: string) => ({ id, farm_id: 'f', crop_id: 'c1', area_str: area });
const harvest = (id: string, p: string, day: string, crates: string) => ({ id, farm_id: 'f', planting_id: p, harvested_at: `${day}T08:00:00.000Z`, crates_str: crates });

describe('own-record statistics (never invented)', () => {
  it('yield per στρέμμα and days between harvest days come from the crop\'s own records, with the number of records', () => {
    const hs = [harvest('h1', 'p1', '2026-10-01', '10'), harvest('h2', 'p1', '2026-10-25', '20'), harvest('h3', 'p1', '2026-11-18', '30')];
    const s = cropStats('c1', [planting('p1', '2')], hs);
    expect(s.yield).toEqual({ perStrema: 10, n: 3 });          // (5 + 10 + 15) / 3
    expect(s.gap).toEqual({ days: 24, n: 2 });
    expect(isFew(s.yield!.n)).toBe(false); expect(isFew(s.gap!.n)).toBe(true);        // 3 records are enough, 2 gaps are not
  });
  it('fewer records than the minimum say «few data» (the value is still returned, flagged)', () => {
    const s = cropStats('c1', [planting('p1', '1')], [harvest('h1', 'p1', '2026-10-01', '4')]);
    expect(MIN_RECORDS).toBeGreaterThan(1);
    expect(isFew(s.yield!.n)).toBe(true);
  });
  it('an unreadable crate number or a planting without a valid area is counted apart, never as zero', () => {
    const s = cropStats('c1', [planting('p1', '1'), planting('p2', '')], [harvest('h1', 'p1', '2026-10-01', 'x'), harvest('h2', 'p2', '2026-10-02', '5')]);
    expect(s.yield).toBeUndefined();
    expect(s.unusable).toBe(2);
  });
  it('other crops and deleted rows are ignored', () => {
    const s = cropStats('c1', [{ id: 'p9', farm_id: 'f', crop_id: 'c2', area_str: '1' }], [harvest('h1', 'p9', '2026-10-01', '9')]);
    expect(s.yield).toBeUndefined(); expect(s.gap).toBeUndefined();
  });
});

describe('harvest pace: remaining crates ÷ remaining days', () => {
  it('uses the owner\'s estimate and an end date', () => {
    const p = harvestPace({ crates: '54', end: '2026-12-11' }, '2026-11-23');
    expect(p).toEqual({ known: true, days: 18, perDay: 3, endDay: '2026-12-11' });
  });
  it('no estimate, a bad number or an end date that is not ahead = unknown with the reason', () => {
    expect(harvestPace(undefined, '2026-11-23')).toEqual({ known: false, reason: 'no-estimate' });
    expect(harvestPace({ crates: 'abc', end: '2026-12-11' }, '2026-11-23')).toEqual({ known: false, reason: 'bad-crates' });
    expect(harvestPace({ crates: '54', end: '2026-11-23' }, '2026-11-23')).toEqual({ known: false, reason: 'bad-end' });
  });
});

describe('recent pace from the records', () => {
  it('crates of the last N days ÷ N; older harvests and unreadable numbers do not count; nothing recorded = undefined', () => {
    const hs = [harvest('h1', 'p1', '2026-11-20', '14'), harvest('h2', 'p1', '2026-11-22', '7'), harvest('h3', 'p1', '2026-10-01', '99'), harvest('h4', 'p1', '2026-11-21', 'x')];
    expect(recentPace('c1', [planting('p1', '1')], hs, '2026-11-23', 21)).toEqual({ perDay: 1, crates: 21 });
    expect(recentPace('c1', [planting('p1', '1')], [harvest('h3', 'p1', '2026-10-01', '9')], '2026-11-23', 21)).toBeUndefined();
  });
});
