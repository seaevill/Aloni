import { describe, expect, it } from 'vitest';
import { groupJobs, nextDay } from '../../src/summary/jobs';
import type { Row } from '../../src/db/schema';

const job = (id: string, planned_for?: string): Row => ({ id, farm_id: 'f', planned_for });
describe('open jobs grouped for the foreman (T9)', () => {
  it('overdue / today / tomorrow / later by the Athens day; a job without a date is today\'s; each group sorted by date', () => {
    const g = groupJobs([job('l', '2026-11-25'), job('t2', '2026-11-20'), job('o2', '2026-11-18'), job('o1', '2026-11-17'), job('tm', '2026-11-21'), job('nd')], '2026-11-20');
    expect(g.overdue.map((j) => j.id)).toEqual(['o1', 'o2']); expect(g.today.map((j) => j.id)).toEqual(['nd', 't2']);
    expect(g.tomorrow.map((j) => j.id)).toEqual(['tm']); expect(g.later.map((j) => j.id)).toEqual(['l']);
  });
  it('tomorrow across a month and a year end', () => { expect(nextDay('2026-11-30')).toBe('2026-12-01'); expect(nextDay('2026-12-31')).toBe('2027-01-01'); });
});
