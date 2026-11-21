import { describe, expect, it } from 'vitest';
import { jobDetail } from '../../src/summary/jobs';
import type { Row } from '../../src/db/schema';

// Εργασίες → a job opens its detail: the day, whether it is late, which crop · field, the product, who it was given to, the spray record made for it and the harvests logged on the same plantings since the planned day. Unknown stays unknown (never 0, never invented).
const r = (o: Record<string, unknown>): Row => ({ id: '', farm_id: 'f', ...o });
const rows = {
  jobs: [r({ id: 'j1', kind: 'spray', status: 'planned', planned_for: '2026-11-18', product_id: 'pr1', worker_id: 'w1' }), r({ id: 'j2', kind: 'spray', status: 'planned', product_id: 'pr1' }), r({ id: 'j3', kind: 'spray', status: 'done', planned_for: '2026-11-10', done_at: '2026-11-11T08:00:00.000Z', product_id: 'pr1', worker_id: 'w1' })],
  links: [r({ job_id: 'j1', planting_id: 'p1' }), r({ job_id: 'j1', planting_id: 'p2' }), r({ job_id: 'j3', planting_id: 'p1' })],
  plantings: [r({ id: 'p1', crop_id: 'c1', parcel_id: 'pa1' }), r({ id: 'p2', crop_id: 'c2', parcel_id: 'pa1' })],
  sprays: [r({ id: 's1', job_id: 'j3', sprayed_at: '2026-11-11T07:30:00.000Z' })],
  harvests: [r({ id: 'h1', planting_id: 'p1', harvested_at: '2026-11-19T09:00:00.000Z', crates_str: '12' }), r({ id: 'h2', planting_id: 'p1', harvested_at: '2026-11-15T09:00:00.000Z', crates_str: '5' }), r({ id: 'h3', planting_id: 'p2', harvested_at: '2026-11-20T09:00:00.000Z', crates_str: 'a few' })],
};
const today = '2026-11-21';

describe('jobDetail', () => {
  it('a late planned job: day, late flag, its plantings, product and worker, no spray record yet', () => {
    const d = jobDetail('j1', rows, today)!;
    expect(d).toMatchObject({ plannedFor: '2026-11-18', late: true, productId: 'pr1', workerId: 'w1', spray: undefined });
    expect(d.plantings.map((p) => [p.cropId, p.parcelId])).toEqual([['c1', 'pa1'], ['c2', 'pa1']]);
  });
  it('harvests on the same plantings since the planned day: newest first, an unreadable count is kept and marked (never 0)', () => {
    const d = jobDetail('j1', rows, today)!;
    expect(d.harvests.map((h) => [h.id, h.crates])).toEqual([['h3', undefined], ['h1', 12]]);       // h2 is before the planned day
  });
  it('a job without a day is not late and says the day is unknown; without a worker the worker is unknown', () => {
    const d = jobDetail('j2', rows, today)!;
    expect(d).toMatchObject({ plannedFor: undefined, late: false, workerId: undefined });
  });
  it('a finished job shows the spray record that was made for it and is never «late»', () => {
    const d = jobDetail('j3', rows, today)!;
    expect(d.spray).toMatchObject({ id: 's1', at: '2026-11-11T07:30:00.000Z' });
    expect(d.late).toBe(false);
  });
  it('an unknown or removed job is undefined (the sheet then says it was not found)', () => {
    expect(jobDetail('nope', rows, today)).toBeUndefined();
    expect(jobDetail('j1', { ...rows, jobs: [r({ id: 'j1', kind: 'spray', status: 'planned', deleted_at: '2026-11-19T00:00:00.000Z' })] }, today)).toBeUndefined();
  });
});
