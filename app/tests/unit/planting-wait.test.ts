import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { parcelWait, plantingWait } from '../../src/summary/wait';
import { signedLabelFor } from '../helpers/labels';

// C10: the Καλλιέργειες and Χωράφια cards show the last spraying and the waiting state FROM THE RECORDS, by the same rule as the harvest gate (harvestGate = the server's planting_gate): the SIGNED label of the planting's
// own crop, unknown = closed. Nothing is worked out separately.
const pls: Row[] = [{ id: 'x1', farm_id: 'f', parcel_id: 'P', crop_id: 'cx' }, { id: 'x2', farm_id: 'f', parcel_id: 'P', crop_id: 'cx' }, { id: 'z1', farm_id: 'f', parcel_id: 'Q', crop_id: 'cz' }];
const link = (job: string, planting: string): Row => ({ id: `l-${job}-${planting}`, farm_id: 'f', job_id: job, planting_id: planting });
const spray = (id: string, job: string, at: string, over: Record<string, unknown> = {}): Row => ({ id, farm_id: 'f', job_id: job, product_id: 'pq', sprayed_at: at, phi_days: '3', rei_hours: '24', ...over });
const NOW = '2026-11-14T08:00:00Z';

describe('plantingWait', () => {
  it('a planting that was never sprayed: free, no last spraying', () => {
    expect(plantingWait('x2', NOW, [link('j1', 'x1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, [])).toEqual({ lastSprayAt: undefined, state: 'free' });
  });
  it('sprayed with the SIGNED label of its own crop: running until the end of the label period; free after it; the last spraying is shown', () => {
    const labels = [signedLabelFor('pq', 'cx', '7', '24')];
    expect(plantingWait('x1', NOW, [link('j1', 'x1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, labels)).toEqual({ lastSprayAt: '2026-11-10T08:00:00Z', state: 'running', until: '2026-11-17T08:00:00Z' });
    expect(plantingWait('x1', '2026-11-18T08:00:00Z', [link('j1', 'x1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, labels)).toEqual({ lastSprayAt: '2026-11-10T08:00:00Z', state: 'free' });
  });
  it('no signed label for this crop (or only another crop\'s) = unknown, never free', () => {
    expect(plantingWait('x1', NOW, [link('j1', 'x1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, [])).toMatchObject({ state: 'unknown' });
    expect(plantingWait('x1', NOW, [link('j1', 'x1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, [signedLabelFor('pq', 'cz', '3', '24')])).toMatchObject({ state: 'unknown' });
  });
  it('the LAST spraying is the newest effective one; a correction replaces its original', () => {
    const labels = [signedLabelFor('pq', 'cx', '3', '24')];
    const sprays = [spray('s1', 'j1', '2026-11-01T08:00:00Z'), spray('s2', 'j2', '2026-11-05T08:00:00Z'), spray('s3', 'j2', '2026-11-06T08:00:00Z', { amends_id: 's2' })];
    expect(plantingWait('x1', NOW, [link('j1', 'x1'), link('j2', 'x1')], sprays, pls, labels).lastSprayAt).toBe('2026-11-06T08:00:00Z');
  });
});

describe('parcelWait', () => {
  it('summarises the parcel: unknown if ANY planting is unknown, else the latest end, else free; the newest spraying over its plantings', () => {
    const labels = [signedLabelFor('pq', 'cx', '7', '24')];
    const l = [link('j1', 'x1')]; const s = [spray('s1', 'j1', '2026-11-10T08:00:00Z')];
    expect(parcelWait('P', NOW, pls, l, s, labels)).toEqual({ lastSprayAt: '2026-11-10T08:00:00Z', state: 'running', until: '2026-11-17T08:00:00Z' });
    expect(parcelWait('P', NOW, pls, l, s, [])).toMatchObject({ state: 'unknown' });
    expect(parcelWait('Q', NOW, pls, l, s, labels)).toEqual({ lastSprayAt: undefined, state: 'free' });
  });
});
