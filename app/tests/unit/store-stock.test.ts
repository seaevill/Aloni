import { describe, expect, it } from 'vitest';
import { storeStock } from '../../src/stock/store-stock';

const crops = [{ id: 'c1', farm_id: 'f', slug: 'parsley' }, { id: 'c2', farm_id: 'f', slug: 'rocket' }];
const plantings = [{ id: 'p1', farm_id: 'f', crop_id: 'c1', parcel_id: 'x' }, { id: 'p2', farm_id: 'f', crop_id: 'c2', parcel_id: 'x' }];
const h = (id: string, planting_id: string, day: string, crates_str: string, destination?: string) => ({ id, farm_id: 'f', planting_id, harvested_at: `${day}T08:00:00Z`, crates_str, ...(destination ? { destination } : {}) });

describe('storeStock: harvested crates by where they went, per crop', () => {
  it('splits store / dispatch / unknown, never adds unknown into the store, and reports the oldest store day', () => {
    const r = storeStock('2026-11-22', [h('1', 'p1', '2026-11-20', '12', 'store'), h('2', 'p1', '2026-11-21', '8', 'store'), h('3', 'p1', '2026-11-21', '5', 'dispatch'), h('4', 'p1', '2026-11-21', '7'), h('5', 'p2', '2026-11-22', '30', 'store')], plantings, crops);
    expect(r.find((x) => x.slug === 'parsley')).toMatchObject({ store: 20, dispatch: 5, unknown: 7, oldestStoreDay: '2026-11-20', ageDays: 2, unreadable: 0 });
    expect(r.find((x) => x.slug === 'rocket')).toMatchObject({ store: 30, ageDays: 0 });
  });
  it('lists the oldest crop first and counts an unreadable crate number apart (never 0)', () => {
    const r = storeStock('2026-11-22', [h('1', 'p2', '2026-11-22', '3', 'store'), h('2', 'p1', '2026-11-19', '4', 'store'), h('3', 'p1', '2026-11-21', 'abc', 'store')], plantings, crops);
    expect(r.map((x) => x.slug)).toEqual(['parsley', 'rocket']);
    expect(r[0]).toMatchObject({ store: 4, unreadable: 1 });
  });
  it('ignores removed harvests and other days in the future', () => {
    const r = storeStock('2026-11-22', [{ ...h('1', 'p1', '2026-11-20', '9', 'store'), deleted_at: 'x' }, h('2', 'p1', '2026-11-25', '9', 'store')], plantings, crops);
    expect(r).toEqual([]);
  });
});

describe('storeStock: what has left the store (loaded onto a vehicle) comes off the store', () => {
  it('left = store − out; out is kept apart and never changes the other counts', () => {
    const rows = [h('1', 'p1', '2026-11-20', '12', 'store'), h('2', 'p1', '2026-11-21', '8', 'store'), h('3', 'p1', '2026-11-21', '5', 'dispatch'), h('4', 'p1', '2026-11-21', '7')];
    const r = storeStock('2026-11-22', rows, plantings, crops, {}, { parsley: 15 });
    expect(r[0]).toMatchObject({ slug: 'parsley', store: 20, out: 15, left: 5, dispatch: 5, unknown: 7 });
  });
  it('more loaded than recorded in the store is shown as it is (negative), never hidden or clamped', () => {
    const r = storeStock('2026-11-22', [h('1', 'p1', '2026-11-21', '4', 'store')], plantings, crops, {}, { parsley: 6 });
    expect(r[0]).toMatchObject({ store: 4, out: 6, left: -2 });
  });
  it('nothing loaded: out 0, left = store', () => {
    expect(storeStock('2026-11-22', [h('1', 'p1', '2026-11-21', '4', 'store')], plantings, crops)[0]).toMatchObject({ out: 0, left: 4 });
  });
});
