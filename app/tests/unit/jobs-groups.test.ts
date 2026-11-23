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

import { jobHub } from '../../src/summary/jobs';
import { summaryOverdueFor } from './helpers/overdue';

describe('every kind of job is shown, not only sprayings', () => {
  const j = (id: string, kind: string, status = 'planned', planned_for = '2026-11-20', extra: Partial<Row> = {}): Row => ({ id, farm_id: 'f', kind, status, planned_for, ...extra });
  it('open jobs of every kind are grouped; removed jobs are not', () => {
    const hub = jobHub([j('s', 'spray'), j('f', 'fertilise'), j('i', 'irrigate', 'planned', '2026-11-19'), j('o', 'other'), j('x', 'other', 'planned', '2026-11-20', { deleted_at: '2026-11-01T00:00:00Z' })], '2026-11-20');
    expect(hub.open.today.map((r) => r.id).sort()).toEqual(['f', 'o', 's']);
    expect(hub.open.overdue.map((r) => r.id)).toEqual(['i']);
    expect(hub.counts).toMatchObject({ overdue: 1, today: 3 });
  });
  it('jobs of any kind done today are listed as done today', () => {
    const hub = jobHub([j('a', 'fertilise', 'done', '2026-11-20', { done_at: '2026-11-20T08:00:00.000Z' }), j('b', 'spray', 'done', '2026-11-20', { done_at: '2026-11-19T08:00:00.000Z' })], '2026-11-20');
    expect(hub.doneToday.map((r) => r.id)).toEqual(['a']);
  });
  it('the «overdue» line of «who did what» counts every kind too', () => {
    expect(summaryOverdueFor([j('a', 'irrigate', 'planned', '2026-11-10'), j('b', 'spray', 'planned', '2026-11-10')], '2026-11-20')).toBe(2);
  });
});
