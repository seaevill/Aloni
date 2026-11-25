import { describe, expect, it } from 'vitest';
import { isDispatch, serverDestination } from '../../src/stock/destination-words';
import { storeStock } from '../../src/stock/store-stock';

describe('where a harvest went: phone words vs server words (SQL 0036)', () => {
  it('maps the phone word to the server column and back', () => {
    expect(serverDestination('store')).toBe('store');
    expect(serverDestination('dispatch')).toBe('direct');
    expect(isDispatch('direct')).toBe(true);
    expect(isDispatch('dispatch')).toBe(true);
    expect(isDispatch('store')).toBe(false);
    expect(isDispatch(undefined)).toBe(false);
    expect(isDispatch(null)).toBe(false);
  });
  it('a pulled server row with destination = direct counts as dispatch, never as store and never as unknown', () => {
    const crops = [{ id: 'c1', slug: 'spinach' }]; const plantings = [{ id: 'p1', crop_id: 'c1' }];
    const rows = [
      { id: 'h1', planting_id: 'p1', harvested_at: '2026-11-20T08:00:00+02:00', crates_str: '5', destination: 'direct' },
      { id: 'h2', planting_id: 'p1', harvested_at: '2026-11-20T09:00:00+02:00', crates_str: '3', destination: 'store' },
      { id: 'h3', planting_id: 'p1', harvested_at: '2026-11-20T10:00:00+02:00', crates_str: '2' },   // no destination: unknown, never defaulted
    ];
    const [line] = storeStock('2026-11-21', rows as never, plantings as never, crops as never);
    expect([line?.dispatch, line?.store, line?.unknown]).toEqual([5, 3, 2]);
  });
});
