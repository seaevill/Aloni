import { describe, expect, it } from 'vitest';
import { harvestStock, outTomorrow, type HarvestMovement } from '../../src/stock/harvest-stock';

const input = (id: string, day: string, crates: number, wait: 'eligible' | 'held' | 'unknown' = 'eligible'): HarvestMovement =>
  ({ id, kind: 'in', day, crates, crop: 'spinach', wait });
const output = (id: string, day: string, crates: number): HarvestMovement =>
  ({ id, kind: 'dispatch', day, crates, crop: 'spinach' });

describe('harvest stock', () => {
  it('uses oldest eligible stock first and counts held separately', () => {
    const rows = [input('later', '2026-11-16', 10), input('first', '2026-11-15', 6),
      input('hold', '2026-11-15', 20, 'held'), input('unknown', '2026-11-15', 4, 'unknown'),
      output('shipment', '2026-11-17', 7)];
    expect(harvestStock('spinach', '2026-11-17', rows)).toEqual({
      known: true, eligible: 9, held: 20, unknown: 4, lots: [{ id: 'later', crates: 9, ageDays: 1 }],
    });
  });
  it('returns unknown when dispatched volume exceeds eligible stock at dispatch', () => {
    expect(harvestStock('spinach', '2026-11-18', [input('late', '2026-11-18', 9), output('early', '2026-11-16', 1)]))
      .toEqual({ known: false, reason: 'dispatch_exceeds_available' });
    expect(harvestStock('spinach', '2026-11-18', [input('hold', '2026-11-16', 9, 'held'), output('early', '2026-11-17', 1)]))
      .toEqual({ known: false, reason: 'dispatch_exceeds_available' });
  });
  it('returns tomorrow’s dated dispatches without unrecorded values', () => {
    expect(outTomorrow('2026-11-30', [output('yes', '2026-12-01', 1), output('no', '2026-12-02', 2)]))
      .toEqual([output('yes', '2026-12-01', 1)]);
    expect(harvestStock('spinach', '2026-11-17', [])).toEqual({ known: false, reason: 'no_movements' });
  });
});
