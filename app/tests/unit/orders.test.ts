import { describe, expect, it } from 'vitest';
import { sowHint, supplyByCrop } from '../../src/orders/available';
import { cratesByCrop, mondayOf, parseBackup, suggestCropMap } from '../../src/orders/klouves';
import { signedLabelFor } from '../helpers/labels';
import type { Row } from '../../src/db/schema';

const backup = (data: Record<string, unknown>, app = 'klouves'): string => JSON.stringify({ app, at: '2026-11-20T09:00:00Z', data });
const cfg = { products: [{ id: 'p1', name: 'Σπανάκι' }, { id: 'p2', name: 'Ispanak ' }, { id: 'p3', name: 'Κάτι άγνωστο' }], clients: [{ id: 'c1', name: 'A' }] };

describe('Κλούβες backup', () => {
  it('weeks run Monday–Sunday', () => { expect(mondayOf('2026-11-22')).toBe('2026-11-16'); expect(mondayOf('2026-11-23')).toBe('2026-11-23'); expect(mondayOf('2026-02-30')).toBeUndefined(); });
  it('sums all clients and days of a week per product; quarters are exact', () => {
    const r = parseBackup(backup({ 'klv.db.cfg': cfg, 'klv.db.day.2026-11-17': { orders: { c1: { p1: 2.5, p3: 1 }, c2: { p1: 0.25 } } }, 'klv.db.day.2026-11-21': { orders: { c1: { p1: 1 } } }, 'klv.db.day.2026-11-24': { orders: { c1: { p1: 4 } } } }));
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.orders.weeks['2026-11-16']).toEqual({ p1: 3.75, p3: 1 });
    expect(r.orders.weeks['2026-11-23']).toEqual({ p1: 4 });
    expect(r.orders.skipped).toBe(0);
  });
  it('a quantity that is not in quarters (or negative / text) is skipped and counted, never rounded', () => {
    const r = parseBackup(backup({ 'klv.db.cfg': cfg, 'klv.db.day.2026-11-17': { orders: { c1: { p1: 0.3, p2: -1, p3: '2' } } } }));
    expect(r.ok && r.orders.skipped).toBe(3); expect(r.ok && r.orders.weeks).toEqual({});
  });
  it('anything that is not a Κλούβες backup is refused', () => {
    for (const bad of ['', 'x', '[]', '{}', backup({}, 'other'), backup({}), JSON.stringify({ app: 'klouves' })]) expect(parseBackup(bad).ok).toBe(false);
  });
  it('the crop guess uses only identical names (Greek or Turkish); the rest stays unmapped and uncounted', () => {
    const map = suggestCropMap(cfg.products);
    expect(map).toEqual({ p1: 'spinach', p2: 'spinach' });
    expect(cratesByCrop({ p1: 2, p2: 1, p3: 5 }, map)).toEqual({ bySlug: { spinach: 3 }, unmapped: ['p3'] });
  });
});

describe('available crates', () => {
  const now = '2026-11-20T10:00:00.000Z';
  const crops: Row[] = [{ id: 'c-sp', farm_id: 'f', slug: 'spinach' }, { id: 'c-ro', farm_id: 'f', slug: 'rocket' }];
  const pl = (id: string, crop: string, status = 'growing'): Row => ({ id, farm_id: 'f', crop_id: crop, status });
  const plantings = [pl('free', 'c-sp'), pl('held', 'c-sp'), pl('unk', 'c-sp'), pl('plan', 'c-sp', 'planned'), pl('r1', 'c-ro')];
  const R = (o: Record<string, unknown>): Row => ({ id: String(o.id ?? o.planting_id ?? o.job_id), farm_id: 'f', ...o });
  const links: Row[] = [R({ planting_id: 'held', job_id: 'j1' }), R({ id: 'l2', planting_id: 'unk', job_id: 'j2' })];
  const sprays: Row[] = [R({ id: 's1', job_id: 'j1', product_id: 'pq', sprayed_at: '2026-11-19T08:00:00Z', phi_days: '7', rei_hours: '24' }), R({ id: 's2', job_id: 'j2', product_id: 'pq', sprayed_at: '2026-11-19T08:00:00Z', phi_days: '', rei_hours: '24' })];
  const harvests: Row[] = [R({ id: 'h1', planting_id: 'free', crates_str: '12', harvested_at: '2026-11-19T07:00:00Z' }), R({ id: 'h2', planting_id: 'free', crates_str: '5', harvested_at: '2026-11-01T07:00:00Z' }), R({ id: 'h3', planting_id: 'held', crates_str: 'x', harvested_at: '2026-11-19T07:00:00Z' })];
  const s = supplyByCrop(now, crops, plantings, links, sprays, harvests, [signedLabelFor('pq', 'c-sp'), signedLabelFor('pq', 'c-ro')]);
  it('only a planting with every waiting period over counts as supply; running and unknown ones are held and NOT counted', () => {
    expect(s.spinach).toEqual({ slug: 'spinach', free: 1, held: 1, unknown: 1, cut7: 12 });
    expect(s.rocket?.free).toBe(1);
  });
  it('the sowing hint', () => { expect(sowHint(s.spinach)).toBe('ready'); expect(sowHint({ slug: 'x', free: 0, held: 1, unknown: 0, cut7: 0 })).toBe('held'); expect(sowHint(undefined)).toBe('none'); });
});
