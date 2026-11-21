import { describe, expect, it } from 'vitest';
import { todaySummary } from '../../src/summary/today';

const name = (id: unknown): string => String(id);
describe('who did what today (Athens day)', () => {
  const sprays = [
    { id: 's1', applicator_id: 'Γιώργος', product_id: 'K', sprayed_at: '2026-11-19T07:00:00Z' },
    { id: 's2', applicator_id: 'Ahmet', product_id: 'S', sprayed_at: '2026-11-18T07:00:00Z' },
    { id: 's3', applicator_id: 'Ahmet', product_id: 'S', sprayed_at: '2026-11-18T22:30:00Z' },   // 00:30 on the 19th in Athens
  ];
  it('counts the sprayings of the Athens day, the corrected one only once, and the crates exactly', () => {
    const r = todaySummary('2026-11-19', [...sprays, { id: 's1b', amends_id: 's1', applicator_id: 'Γιώργος', product_id: 'K', sprayed_at: '2026-11-19T07:00:00Z' }] as never, [
      { harvested_at: '2026-11-19T08:00:00Z', crates_str: '3' }, { harvested_at: '2026-11-19T09:00:00Z', crates_str: '0.5' }, { harvested_at: '2026-11-18T09:00:00Z', crates_str: '9' }] as never, [], name, name);
    expect(r.done.map((d) => d.sprayId)).toEqual(['s3', 's1b']);
    expect(r.crates).toBe('3.5'); expect(r.harvests).toBe(2);
  });
  it('overdue = planned for an earlier day and still open; empty data gives an empty summary', () => {
    const r = todaySummary('2026-11-19', [], [], [{ id: 'j1', kind: 'spray', status: 'planned', planned_for: '2026-11-18' }, { id: 'j2', kind: 'spray', status: 'planned', planned_for: '2026-11-19' }, { id: 'j3', kind: 'spray', status: 'done', planned_for: '2026-11-10' }] as never, name, name);
    expect(r.overdue.map((j) => j.id)).toEqual(['j1']);
    expect(todaySummary('2026-11-19', [], [], [], name, name)).toEqual({ done: [], crates: '0', harvests: 0, overdue: [] });
  });
});

import { cratesLogged, cratesPerDay } from '../../src/summary/today';
import type { Row } from '../../src/db/schema';
// D11: the Σήμερα numbers come only from LOGGED harvests; a day nobody logged is a gap (null), never a 0.
const h = (at: string, crates: string): Row => ({ id: at + crates, farm_id: 'f', planting_id: 'p', harvested_at: at, crates_str: crates } as unknown as Row);
describe('crates per day (Athens days, logged only)', () => {
  const now = '2026-11-21T10:00:00Z';   // Sat 21 Nov, Athens
  it('seven Athens days, oldest first; a day with no readable log is null, not 0', () => {
    const r = cratesPerDay([h('2026-11-21T06:00:00Z', '4'), h('2026-11-21T08:00:00Z', '3'), h('2026-11-19T09:00:00Z', '5'), h('2026-11-16T09:00:00Z', '9')], now, 7);
    expect(r).toEqual([null, 9, null, null, 5, null, 7]);        // 15..21 Nov, Athens days
  });
  it('an entry with an unreadable crate count or time counts for nothing (the day stays a gap)', () => {
    expect(cratesPerDay([h('2026-11-21T06:00:00Z', 'abc'), { id: 'x', harvested_at: 'bad', crates_str: '3' } as unknown as Row], now, 7)).toEqual([null, null, null, null, null, null, null]);
  });
  it('a real zero stays a zero: a logged «0» is not a gap', () => {
    expect(cratesPerDay([h('2026-11-21T06:00:00Z', '0')], now, 7)[6]).toBe(0);
  });
  it('the day boundary is Athens midnight, not UTC', () => {
    const r = cratesPerDay([h('2026-11-20T22:30:00Z', '2')], now, 7);   // 00:30 on the 21st in Athens
    expect(r[6]).toBe(2); expect(r[5]).toBeNull();
  });
  it('cratesLogged: undefined when nothing readable was logged in the window (the screen says «άγνωστο»), else the exact whole-crate sum', () => {
    expect(cratesLogged([], now, 7)).toBeUndefined();
    expect(cratesLogged([h('2026-11-21T06:00:00Z', 'abc')], now, 7)).toBeUndefined();
    expect(cratesLogged([h('2026-11-21T06:00:00Z', '4'), h('2026-11-20T06:00:00Z', '3')], now, 7)).toBe(7);
    expect(cratesLogged([h('2026-11-01T06:00:00Z', '4')], now, 7)).toBeUndefined();
  });
});
