import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { buildLabelUse } from '../../src/labels/label-use';
import { harvestGate, reiLockParcel } from '../../src/spray/harvest';
import { signedLabelFor } from '../helpers/labels';

// m9 S-NEW-1: the phone's gate follows the server's (private.planting_gate, supabase/tests/m13_m8.sql): the SIGNED label of the planting's OWN crop for the spray's own product decides;
// no such label, an unsigned draft or a label with a hole = unknown = closed; a stored or typed period may only extend, never shorten.
const pls: Row[] = [{ id: 'x1', farm_id: 'f', parcel_id: 'P', crop_id: 'cx' }, { id: 'z1', farm_id: 'f', parcel_id: 'P', crop_id: 'cz' }];
const links = (job: string, planting: string): Row[] => [{ id: `l-${job}-${planting}`, farm_id: 'f', job_id: job, planting_id: planting }];
const spray = (over: Record<string, unknown> = {}): Row => ({ id: 's1', farm_id: 'f', job_id: 'j1', product_id: 'pq', sprayed_at: '2026-11-10T08:00:00Z', phi_days: '3', rei_hours: '24', ...over });
const draft = (crop: string): Row => { const r = buildLabelUse({ productId: 'pq', cropId: crop, target: '', source: '', kind: 'single', unit: 'ml/str', doseMin: { notOnLabel: false, text: '0,025' }, doseMax: { notOnLabel: false, text: '' }, phi: { notOnLabel: false, text: '1' }, rei: { notOnLabel: false, text: '1' }, maxApps: { notOnLabel: false, text: '3' } }, 'f', '2026-11-01T00:00:00.000Z', `d-${crop}`); if (!r.ok) throw new Error('setup'); return r.row; };
const AT = '2026-11-14T08:00:00Z';      // day 4 after the spray

describe('the phone gate follows the server gate', () => {
  it('a label of ANOTHER crop (the legacy X+Y row) does not open the planting of crop X: unknown = closed', () => {
    expect(harvestGate('x1', AT, links('j1', 'x1'), [spray()], pls, [signedLabelFor('pq', 'cy', '3', '24')])).toEqual({ ok: false, reason: 'unknown' });
  });
  it('an UNSIGNED draft with values decides nothing: closed', () => {
    expect(harvestGate('z1', AT, links('j1', 'z1'), [spray()], pls, [draft('cz')])).toEqual({ ok: false, reason: 'unknown' });
  });
  it('a typed period SHORTER than the signed label does not open: the label (14 days) still runs on day 4', () => {
    const g = harvestGate('x1', AT, links('j1', 'x1'), [spray({ phi_days: '3' })], pls, [signedLabelFor('pq', 'cx', '14', '24')]);
    expect(g).toMatchObject({ ok: false, reason: 'running', until: '2026-11-24T08:00:00Z' });
  });
  it('a typed period LONGER than the label still closes (a recorded period is never shortened)', () => {
    const g = harvestGate('x1', '2026-11-16T08:00:00Z', links('j1', 'x1'), [spray({ phi_days: '30' })], pls, [signedLabelFor('pq', 'cx', '14', '24')]);
    expect(g).toMatchObject({ ok: false, reason: 'running', until: '2026-12-10T08:00:00Z' });
  });
  it('the planting\'s own signed label opens it only after its own period', () => {
    const lab = [signedLabelFor('pq', 'cx', '3', '24')];
    expect(harvestGate('x1', '2026-11-13T08:00:01Z', links('j1', 'x1'), [spray()], pls, lab)).toEqual({ ok: true });
    expect(harvestGate('x1', '2026-11-13T08:00:00Z', links('j1', 'x1'), [spray()], pls, lab)).toMatchObject({ ok: false, reason: 'running' });
  });
  it('the re-entry lock reads the planting\'s OWN crop REI (48 h), not the other crop\'s 24 h', () => {
    const now = '2026-11-11T14:00:00Z';      // 30 h after the spray: the crop-Y 24 h are over, crop X\'s 48 h are not
    const lock = reiLockParcel('P', now, pls, links('j1', 'x1'), [spray()], [signedLabelFor('pq', 'cx', '14', '48')]);
    expect(lock).toEqual({ state: 'running', until: '2026-11-12T08:00:00Z' });
    expect(reiLockParcel('P', now, pls, links('j1', 'x1'), [spray()], [signedLabelFor('pq', 'cy', '14', '24')])).toEqual({ state: 'unknown' });
  });
});
