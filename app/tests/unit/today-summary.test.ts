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
