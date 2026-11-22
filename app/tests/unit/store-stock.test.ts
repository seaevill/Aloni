import { describe, expect, it } from 'vitest';
import { storeStock } from '../../src/stock/store-stock';

const crops = [{ id: 'c1', farm_id: 'f', slug: 'parsley' }, { id: 'c2', farm_id: 'f', slug: 'rocket' }];
const plantings = [{ id: 'p1', farm_id: 'f', crop_id: 'c1', parcel_id: 'x' }, { id: 'p2', farm_id: 'f', crop_id: 'c2', parcel_id: 'x' }];
const h = (id: string, planting_id: string, day: string, crates_str: string, destination?: string) => ({ id, farm_id: 'f', planting_id, harvested_at: `${day}T08:00:00Z`, crates_str, ...(destination ? { destination } : {}) });

describe('storeStock: harvested crates by where they went, per crop', () => {
  it('splits store and direct dispatch and keeps unknown destinations as a flag, and reports the oldest store day', () => {
    const r = storeStock('2026-11-22', [h('1', 'p1', '2026-11-20', '12', 'store'), h('2', 'p1', '2026-11-21', '8', 'store'), h('3', 'p1', '2026-11-21', '5', 'direct'), h('4', 'p1', '2026-11-21', '7'), h('5', 'p2', '2026-11-22', '30', 'store')], plantings, crops);
    expect(r.find((x) => x.slug === 'parsley')).toMatchObject({ store: 20, dispatch: 5, hasUnknownDestination: true, oldestStoreDay: '2026-11-20', ageDays: 2, unreadable: 0 });
    expect(r.find((x) => x.slug === 'rocket')).toMatchObject({ store: 30, ageDays: 0 });
  });
  it('lists the oldest crop first and counts an unreadable crate number apart (never 0)', () => {
    const r = storeStock('2026-11-22', [h('1', 'p2', '2026-11-22', '3', 'store'), h('2', 'p1', '2026-11-19', '4', 'store'), h('3', 'p1', '2026-11-21', 'abc', 'store')], plantings, crops);
    expect(r.map((x) => x.slug)).toEqual(['parsley', 'rocket']);
    expect(r[0]).toMatchObject({ store: 4, unreadable: 1 });
  });
  it('excludes a held quantity from all totals and flags the partial split', () => {
    const r = storeStock('2026-11-22', [
      h('held', 'p1', '2026-11-18', '22', 'store'),
      h('free', 'p1', '2026-11-20', '7', 'store'),
      h('legacy', 'p1', '2026-11-21', '51'),
    ], plantings, crops, {}, new Set(['legacy', 'free']));
    expect(r).toMatchObject([{ store: 7, dispatch: 0, hasUnknownDestination: true, hasUncounted: true, oldestStoreDay: '2026-11-20' }]);
    expect(r[0]?.unknown).toBe(0);
  });
  it('ignores removed harvests and other days in the future', () => {
    const r = storeStock('2026-11-22', [{ ...h('1', 'p1', '2026-11-20', '9', 'store'), deleted_at: 'x' }, h('2', 'p1', '2026-11-25', '9', 'store')], plantings, crops);
    expect(r).toEqual([]);
  });
});
