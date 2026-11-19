import { describe, expect, it } from 'vitest';
import { supplyTable } from './supply';

// Golden case A05 (fixtures/golden/A05-gap-spinach.json, copied here: rules-core tests read no files): the weekly table must match the prototype's figures within one crate.
// The rule is unsigned: the table is information, never an alert.
const AS_OF = '2026-11-16T06:40:00+02:00';
const PLANTINGS = [
  { id: 'PL01', cropId: 'spinach', estCrates: 225, loggedCrates: 38 + 36, harvestFrom: '2026-11-10', harvestTo: '2026-11-28', safeFrom: '2026-11-09T10:45:00+02:00' },
  { id: 'PL08', cropId: 'spinach', estCrates: 225, loggedCrates: 0, harvestFrom: '2026-12-03', harvestTo: '2026-12-22', safeFrom: '2026-11-13T11:30:00+02:00' },
];
const EXPECTED = { orders: [90, 90, 90, 90, 90, 117, 90], supply: [81.3, 69.7, 45.0, 78.8, 78.8, 22.5, 0.0], gap: [8.7, 20.3, 45.0, 11.2, 11.2, 94.5, 90.0] };

describe('SUPPLY vs ORDERS (A05, information only)', () => {
  const table = supplyTable(AS_OF, 7, PLANTINGS, { cropId: 'spinach', cratesPerWeek: 90, multipliers: [{ weekStart: '2026-12-21', factor: 1.3 }] });
  it('orders, supply and gap match the golden figures within one crate', () => {
    table.forEach((row, i) => {
      expect(Math.abs(row.orders - EXPECTED.orders[i])).toBeLessThanOrEqual(1);
      expect(Math.abs(row.supply - EXPECTED.supply[i])).toBeLessThanOrEqual(1);
      expect(Math.abs(row.gap - EXPECTED.gap[i])).toBeLessThanOrEqual(1);
    });
  });
  it('nothing counts before the end of the waiting period; a planting with no safe_from date counts from its harvest start', () => {
    const p = { id: 'X', cropId: 'c', estCrates: 70, loggedCrates: 0, harvestFrom: '2026-11-16', harvestTo: '2026-11-29' };
    const held = supplyTable('2026-11-16T06:00:00+02:00', 2, [{ ...p, safeFrom: '2026-11-23T10:00:00+02:00' }], { cropId: 'c', cratesPerWeek: 0, multipliers: [] });
    expect(held.map((r) => r.supply)).toEqual([0, 70]);             // the first week is inside the waiting period: no supply; all 70 crates fall in the second week
    const open = supplyTable('2026-11-16T06:00:00+02:00', 2, [{ ...p, safeFrom: undefined }], { cropId: 'c', cratesPerWeek: 0, multipliers: [] });
    expect(open.map((r) => r.supply)).toEqual([35, 35]);
  });
  it('a planting with an unreadable date counts for nothing', () => {
    const t = supplyTable('2026-11-16', 1, [{ id: 'X', cropId: 'c', estCrates: 70, loggedCrates: 0, harvestFrom: 'soon', harvestTo: '2026-11-29', safeFrom: undefined }], { cropId: 'c', cratesPerWeek: 10, multipliers: [] });
    expect(t[0].supply).toBe(0); expect(t[0].gap).toBe(10);
  });
});
