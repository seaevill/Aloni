import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { cropSummary, harvestTable } from '../../src/summary/drill';

// Σήμερα drill-downs: every number opens a table that adds up to it. Only LOGGED harvests; an unreadable count is listed apart, never added, never 0.
const R = (o: Record<string, unknown>) => o as unknown as Row;
const crops = [R({ id: 'c1', slug: 'spinach' }), R({ id: 'c2', slug: 'rocket' })];
const parcels = [R({ id: 'pa1', name: 'Κάτω Κάμπος' }), R({ id: 'pa2', name: 'Μεσαίο Χωράφι' })];
const plantings = [R({ id: 'pl1', crop_id: 'c1', parcel_id: 'pa1', area_str: '0,5' }), R({ id: 'pl2', crop_id: 'c2', parcel_id: 'pa2', area_str: '1' }), R({ id: 'pl3', crop_id: 'c1', parcel_id: 'pa2', area_str: '2', deleted_at: 'x' })];
const h = (id: string, pl: string, at: string, n: string, by?: string) => R({ id, planting_id: pl, harvested_at: at, crates_str: n, ...(by ? { cut_by: by } : {}) });
const now = '2026-11-21T10:00:00Z';

describe('harvest table (7 / 28 days)', () => {
  const rows = [h('a', 'pl1', '2026-11-21T06:00:00Z', '4'), h('b', 'pl2', '2026-11-20T06:00:00Z', '9'), h('c', 'pl1', '2026-11-10T06:00:00Z', '5'), h('d', 'pl1', '2026-11-21T07:00:00Z', 'abc'), h('e', 'pl1', '2026-09-01T06:00:00Z', '7')];
  it('lists the logged harvests of the window, newest first, with crop, parcel and crates; the total is their exact sum', () => {
    const t = harvestTable(rows, plantings, parcels, crops, now, 7);
    expect(t.rows.map((r) => [r.id, r.crop, r.parcel, r.crates])).toEqual([['a', 'spinach', 'Κάτω Κάμπος', 4], ['b', 'rocket', 'Μεσαίο Χωράφι', 9]]);
    expect(t.total).toBe(13);
    expect(harvestTable(rows, plantings, parcels, crops, now, 28).total).toBe(18);
  });
  it('an unreadable count is listed APART (never added, never 0); no readable log = no total', () => {
    const t = harvestTable(rows, plantings, parcels, crops, now, 7);
    expect(t.unreadable.map((r) => r.id)).toEqual(['d']);
    expect(harvestTable([h('x', 'pl1', '2026-11-21T06:00:00Z', 'zz')], plantings, parcels, crops, now, 7).total).toBeUndefined();
    expect(harvestTable([], plantings, parcels, crops, now, 7).rows).toEqual([]);
  });
  it('a harvest whose planting, crop or parcel is unknown is still listed, with the unknown part left empty (the sheet writes why)', () => {
    const t = harvestTable([h('q', 'gone', '2026-11-21T06:00:00Z', '3')], plantings, parcels, crops, now, 7);
    expect(t.rows[0]).toMatchObject({ id: 'q', crop: undefined, parcel: undefined, crates: 3 });
  });
});

describe('crop summary', () => {
  const rows = [h('a', 'pl1', '2026-11-21T06:00:00Z', '4'), h('b', 'pl1', '2026-11-05T06:00:00Z', '6'), h('c', 'pl2', '2026-11-21T06:00:00Z', '9')];
  it('the live plantings of the crop with their parcels and typed areas; crates today and all logged', () => {
    const s = cropSummary('c1', plantings, parcels, rows, now);
    expect(s.plantings).toEqual([{ id: 'pl1', parcel: 'Κάτω Κάμπος', area: '0,5' }]);          // the archived planting is not listed
    expect(s.today).toBe(4); expect(s.logged).toBe(10);
  });
  it('nothing logged today is «unknown» (undefined), not 0; a crop with no plantings has an empty list', () => {
    expect(cropSummary('c2', plantings, parcels, [h('z', 'pl2', '2026-11-01T06:00:00Z', '3')], now).today).toBeUndefined();
    expect(cropSummary('c9', plantings, parcels, rows, now)).toEqual({ plantings: [], today: undefined, logged: undefined });
  });
});
