import { describe, expect, it } from 'vitest';
import { heatData, monthRingData, seasonSummary, type HarvestRecord } from './recordedHarvest';
import { sowingGaps } from './sowingGaps';

const harvest = (id: string, at: string, crates: number | null, wait: HarvestRecord['wait'] = 'clear'): HarvestRecord =>
  ({ id, at, wait, crates, cropId: 'crop', parcelId: 'parcel' });

describe('record-driven views', () => {
  it('preserves empty, held, and unknown states', () => {
    const empty = heatData([], '2026-11-21');
    expect(empty.weeks).toHaveLength(12);
    expect(empty.parcels).toEqual([]);
    const rows = [harvest('a', '2026-11-20', 4), harvest('b', '2026-11-20', 50, 'held'),
      harvest('c', '2026-11-20', 90, 'unknown'), harvest('d', '2026-11-20', null), harvest('e', 'unknown', 4)];
    const heat = heatData(rows, '2026-11-21');
    expect(heat.parcels[0]?.cells.at(-1)).toMatchObject({ eligible: 4, records: ['a'], held: ['b'], unknown: ['c', 'd'] });
    expect(heat.parcels[0]?.cells[0]?.eligible).toBeNull();
    expect(heat.unplaced).toEqual(['e']);
    const season = { from: '2026-11-01', to: '2026-11-30' };
    expect(seasonSummary(rows, { by: 'crop', id: 'crop' }, season)).toMatchObject({
      overall: { eligible: 4, held: ['b'], unknown: ['c', 'd'] }, undated: ['e'],
    });
    expect(seasonSummary([], { by: 'parcel', id: 'parcel' }, season)?.overall.eligible).toBeNull();
  });

  it.each([
    ['2026-03-29T20:59:59Z', '2026-03-29T21:00:00Z', '2026-03-30'],
    ['2026-10-25T21:59:59Z', '2026-10-25T22:00:00Z', '2026-10-26'],
  ])('buckets both sides of Athens midnight after the DST change', (before, after, day) => {
    const heat = heatData([harvest('before', before, 4), harvest('after', after, 4)], day, 2);
    expect(heat.parcels[0]?.cells.map((cell) => cell.records)).toEqual([['before'], ['after']]);
    expect(heat.weeks[1]).toBe(day);
  });

  it('excludes future instants on the same Athens day', () => {
    const rows = [harvest('already', '2026-11-20T22:29:59Z', 4), harvest('later', '2026-11-20T22:31:00Z', 4)];
    expect(heatData(rows, '2026-11-20T22:30:00Z', 1).parcels[0]?.cells[0]?.records).toEqual(['already']);
  });

  it('keeps only recorded sowing months and known shortfalls', () => {
    expect(monthRingData([{ sownOn: '2026-10-03' }, { sownOn: '2025-10-01' }, { sownOn: '2026-02-30' }, {}])).toEqual([10]);
    expect(sowingGaps([
      { week: 'a', orders: 9, eligible: 4, heldOrUnknown: 20, delta: -5 },
      { week: 'b', orders: 9, eligible: null, heldOrUnknown: 20, delta: null },
      { week: 'c', orders: 9, eligible: 9, heldOrUnknown: null, delta: 0 },
    ])).toEqual([{ week: 'a', orders: 9, eligible: 4, shortfall: 5 }]);
  });
});
