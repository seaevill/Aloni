import { describe, expect, it } from 'vitest';
import { athensDayOf, cutTodayBySlug, nextDay, tomorrowBoard } from '../../src/orders/tomorrow';
import type { KlouvesOrders } from '../../src/orders/klouves';
import type { CropSupply } from '../../src/orders/available';
import type { Row } from '../../src/db/schema';

const orders = (days: KlouvesOrders['days']): KlouvesOrders => ({ products: [{ id: 'p-sp', name: 'Σπανάκι' }, { id: 'p-ro', name: 'Ρόκα' }, { id: 'p-x', name: 'Άγνωστο' }], weeks: {}, skipped: 0, days });
const map = { 'p-sp': 'spinach', 'p-ro': 'rocket' };
const supply = (over: Partial<CropSupply> = {}): CropSupply => ({ slug: 'spinach', free: 0, held: 0, unknown: 0, cut7: 0, ...over });

describe('«Αύριο φεύγουν»: tomorrow\'s orders against what is cut today', () => {
  it('the day boundary is the Athens midnight, winter and summer', () => {
    expect(athensDayOf('2026-11-20T21:59:59Z')).toBe('2026-11-20');   // 23:59:59 in Athens (UTC+2)
    expect(athensDayOf('2026-11-20T22:00:00Z')).toBe('2026-11-21');   // 00:00 in Athens
    expect(athensDayOf('2026-07-20T20:59:59Z')).toBe('2026-07-20');   // 23:59:59 in Athens (UTC+3)
    expect(athensDayOf('2026-07-20T21:00:00Z')).toBe('2026-07-21');
    expect(athensDayOf('not a time')).toBeUndefined();
    expect(nextDay('2026-11-30')).toBe('2026-12-01'); expect(nextDay('2026-12-31')).toBe('2027-01-01'); expect(nextDay('2028-02-28')).toBe('2028-02-29');
  });
  it('sums the crates ordered for tomorrow per crop (all clients), exactly, in quarters', () => {
    const o = orders({ '2026-11-21': { c1: { 'p-sp': 4.5, 'p-ro': 2 }, c2: { 'p-sp': 3.25 } } });
    const b = tomorrowBoard(o, map, { spinach: supply() }, {}, '2026-11-21');
    expect(b.rows.find((r) => r.slug === 'spinach')).toMatchObject({ ordered: 7.75, cut: 0, gap: 7.75, state: 'missing' });
    expect(b.rows.find((r) => r.slug === 'rocket')).toMatchObject({ ordered: 2, state: 'missing' });
  });
  it('compares with the crates ACTUALLY cut today: missing, covered or surplus; a crop cut but not ordered is surplus', () => {
    const o = orders({ '2026-11-21': { c1: { 'p-sp': 6, 'p-ro': 2 } } });
    const b = tomorrowBoard(o, map, {}, { spinach: 4, rocket: 2, parsley: 3 }, '2026-11-21');
    expect(b.rows.find((r) => r.slug === 'spinach')).toMatchObject({ gap: 2, state: 'missing' });
    expect(b.rows.find((r) => r.slug === 'rocket')).toMatchObject({ gap: 0, state: 'covered' });
    expect(b.rows.find((r) => r.slug === 'parsley')).toMatchObject({ ordered: 0, cut: 3, gap: -3, state: 'surplus' });
  });
  it('a planting held by a waiting period (or unknown) never counts as supply: it is shown apart and the gap does not move', () => {
    const o = orders({ '2026-11-21': { c1: { 'p-sp': 5 } } });
    const b = tomorrowBoard(o, map, { spinach: supply({ free: 1, held: 3, unknown: 2 }) }, { spinach: 1 }, '2026-11-21');
    expect(b.rows[0]).toMatchObject({ slug: 'spinach', free: 1, held: 3, unknown: 2, gap: 4, state: 'missing' });
  });
  it('a product with no crop link is counted, never dropped; no import or no orders for the day gives an empty board', () => {
    const o = orders({ '2026-11-21': { c1: { 'p-x': 2, 'p-sp': 1 } } });
    expect(tomorrowBoard(o, map, {}, {}, '2026-11-21').unmapped).toBe(1);
    expect(tomorrowBoard(undefined, map, {}, {}, '2026-11-21')).toEqual({ date: '2026-11-21', rows: [], unmapped: 0 });
    expect(tomorrowBoard(orders({}), map, {}, {}, '2026-11-21').rows).toEqual([]);
  });
  it('counts only the crates cut on THIS Athens day', () => {
    const crops: Row[] = [{ id: 'c1', farm_id: 'f', slug: 'spinach' }];
    const plantings: Row[] = [{ id: 'p1', farm_id: 'f', crop_id: 'c1' }];
    const h = (at: string, n: string): Row => ({ id: at, farm_id: 'f', planting_id: 'p1', harvested_at: at, crates_str: n });
    const out = cutTodayBySlug('2026-11-21', [h('2026-11-20T21:59:00Z', '9'), h('2026-11-20T22:01:00Z', '4'), h('2026-11-21T08:00:00Z', '2'), h('2026-11-21T22:30:00Z', '7')], plantings, crops);
    expect(out).toEqual({ spinach: 6 });                                  // 4 + 2 (the 9 is yesterday in Athens, the 7 is already tomorrow)
  });
});
