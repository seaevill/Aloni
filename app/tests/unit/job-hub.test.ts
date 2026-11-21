import { describe, expect, it } from 'vitest';
import { jobHub } from '../../src/summary/jobs';
import type { Row } from '../../src/db/schema';

const job = (id: string, over: Record<string, unknown>): Row => ({ id, farm_id: 'f', kind: 'spray', status: 'planned', ...over });

describe('jobHub: the «Εργασίες» summary of Σήμερα', () => {
  const jobs = [
    job('late', { planned_for: '2026-11-19' }), job('t1', { planned_for: '2026-11-21' }), job('t2', {}),                // no date = today's work
    job('tom', { planned_for: '2026-11-22' }), job('later', { planned_for: '2026-11-30' }),
    job('d1', { status: 'done', done_at: '2026-11-21T08:00:00Z' }),
    job('d2', { status: 'done', done_at: '2026-11-20T21:59:00Z' }),                                                     // 23:59 in Athens on the 20th: yesterday
    job('d3', { status: 'done', done_at: '2026-11-20T22:30:00Z' }),                                                     // 00:30 in Athens on the 21st: today
    job('gone', { planned_for: '2026-11-21', deleted_at: '2026-11-21T01:00:00Z' }), job('harvest', { kind: 'harvest' }),
  ];
  it('counts overdue, today, upcoming (tomorrow and later) and done today on the ATHENS day', () => {
    const h = jobHub(jobs, '2026-11-21');
    expect([h.counts.overdue, h.counts.today, h.counts.upcoming, h.counts.doneToday]).toEqual([1, 2, 2, 2]);
    expect(h.doneToday.map((j) => j.id)).toEqual(['d3', 'd1']);                                                          // oldest first within the day
  });
  it('removed jobs and jobs that are not sprayings never count; open groups stay as before', () => {
    const h = jobHub(jobs, '2026-11-21');
    expect(h.open.overdue.map((j) => j.id)).toEqual(['late']);
    expect(h.open.today.map((j) => j.id).sort()).toEqual(['t1', 't2']);
    expect(h.open.tomorrow.map((j) => j.id)).toEqual(['tom']);
  });
  it('an empty farm gives zeros', () => {
    expect(jobHub([], '2026-11-21').counts).toEqual({ overdue: 0, today: 0, upcoming: 0, doneToday: 0 });
  });
});
