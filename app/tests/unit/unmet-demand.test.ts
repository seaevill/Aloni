import { describe, expect, it } from 'vitest';
import { unmetDemand } from '../../src/orders/unmet-demand';
import { storeStock } from '../../src/stock/store-stock';
import type { Row } from '../../src/db/schema';

const crops: Row[] = [{ id: 'c1', farm_id: 'f', slug: 'spinach' }, { id: 'c2', farm_id: 'f', slug: 'parsley' }];
const plantings: Row[] = [{ id: 'p1', farm_id: 'f', crop_id: 'c1' }, { id: 'p2', farm_id: 'f', crop_id: 'c2' }];
const h = (id: string, planting_id: string, crates_str: string, extra: Record<string, unknown> = {}): Row => ({ id, farm_id: 'f', planting_id, crates_str, harvested_at: '2026-11-22T08:00:00+02:00', ...extra });

describe('unmet demand (prototype): ordered − verified crates in the store', () => {
  it('the fixture: spinach ordered 40; store 35, 5 loaded → 30 verified → 10 unmet; 12 crates without a destination are shown apart and not counted', () => {
    const store = storeStock('2026-11-23', [h('a', 'p1', '20', { destination: 'store' }), h('b', 'p1', '15', { destination: 'store' }), h('c', 'p1', '12'), h('d', 'p1', '8', { destination: 'dispatch' })], plantings, crops, {}, { spinach: 5 });
    const [row] = unmetDemand({ spinach: 40 }, store);
    expect(row).toEqual({ slug: 'spinach', ordered: 40, verified: 30, unmet: 10, unverified: 12, flags: [] });
  });
  it('a crop ordered but with no store record has verified 0 and the whole order is unmet; a surplus is not negative demand', () => {
    const store = storeStock('2026-11-23', [h('a', 'p1', '50', { destination: 'store' })], plantings, crops);
    const rows = unmetDemand({ parsley: 6, spinach: 20 }, store);
    expect(rows.find((r) => r.slug === 'parsley')).toMatchObject({ verified: 0, unmet: 6 });
    expect(rows.find((r) => r.slug === 'spinach')).toMatchObject({ verified: 50, unmet: 0 });
  });
  it('more loaded than the store shows: verified stays 0 (not netted against demand) and it is flagged; an unreadable crate number is flagged, never counted as 0 or as stock', () => {
    const store = storeStock('2026-11-23', [h('a', 'p1', '10', { destination: 'store' }), h('b', 'p1', 'πολλές', { destination: 'store' })], plantings, crops, {}, { spinach: 14 });
    const [row] = unmetDemand({ spinach: 9 }, store);
    expect(row).toMatchObject({ verified: 0, unmet: 9, flags: ['negative-store', 'unreadable-records'] });
  });
  it('deleted harvests are not stock', () => {
    const store = storeStock('2026-11-23', [h('a', 'p1', '10', { destination: 'store', deleted_at: '2026-11-22T10:00:00Z' })], plantings, crops);
    expect(unmetDemand({ spinach: 4 }, store)).toEqual([{ slug: 'spinach', ordered: 4, verified: 0, unmet: 4, unverified: 0, flags: [] }]);
  });
});
