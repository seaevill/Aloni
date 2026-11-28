import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { buildHarvest } from '../../src/spray/harvest';
import { parcelWait, plantingWait } from '../../src/summary/wait';
import { waitLine } from '../../src/ui/waitLine';

// ev-1: a planting that is only planned («Προγραμματισμένη») has not been sown. Nothing can be harvested from it and no card calls it ready to cut.
const NOW_ISO = '2026-11-28T10:00:00.000Z';
const pl = (id: string, parcel: string, status: string): Row => ({ id, farm_id: 'f', parcel_id: parcel, crop_id: 'c', status });
const PLS = [pl('plan', 'P', 'planned'), pl('grow', 'Q', 'growing'), pl('plan2', 'R', 'planned'), pl('grow2', 'R', 'growing')];
const base = { crates: '5', harvestedAt: '2026-11-28T09:00:00Z', note: '', cutBy: 'w1' };

describe('harvest on a planned planting (escape attempts)', () => {
  it('is refused, flagged planned, and never builds a row', () => {
    const r = buildHarvest({ ...base, plantingId: 'plan' }, [], [], 'f', NOW_ISO, 'h1', PLS, []);
    expect(r).toMatchObject({ ok: false, planned: true });
    expect('row' in r).toBe(false);
  });
  it('is refused even with every other field valid and an open gate (no sprays at all)', () => {
    expect(buildHarvest({ ...base, plantingId: 'plan2' }, [], [], 'f', NOW_ISO, 'h2', PLS, []).ok).toBe(false);
  });
  it('a growing planting still saves', () => {
    expect(buildHarvest({ ...base, plantingId: 'grow' }, [], [], 'f', NOW_ISO, 'h3', PLS, []).ok).toBe(true);
  });
});

describe('cards: planned is not «ready to cut»', () => {
  const now = '2026-11-28T10:00:00Z';
  it('a planned planting is «planned», a growing one is free', () => {
    expect(plantingWait('plan', now, [], [], PLS, [])).toEqual({ lastSprayAt: undefined, state: 'planned' });
    expect(plantingWait('grow', now, [], [], PLS, [])).toEqual({ lastSprayAt: undefined, state: 'free' });
  });
  it('a parcel with only planned plantings is planned; with a growing one beside it, free', () => {
    expect(parcelWait('P', now, PLS, [], [], []).state).toBe('planned');
    expect(parcelWait('Q', now, PLS, [], [], []).state).toBe('free');
    expect(parcelWait('R', now, PLS, [], [], []).state).toBe('free');
  });
  it('the card line reads «Προγραμματισμένη», not the «no waiting recorded» sentence', () => {
    expect(waitLine({ lastSprayAt: undefined, state: 'planned' })).toContain('Προγραμματισμένη');
  });
});
