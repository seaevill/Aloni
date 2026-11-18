import { describe, expect, it } from 'vitest';
import { buildObservation, completeSprayJob, skipSprayJob } from '../../src/worker/jobs';
import { buildLabelUse, withSignOff } from '../../src/labels/label-use';
import type { Row } from '../../src/db/schema';

const F = 'demo-farm';
const now = '2026-11-20T10:00:00.000Z';
const label = (): Row => { const f = (text: string) => ({ notOnLabel: false, text }); const r = buildLabelUse({ productId: 'prod', cropId: 'crop', target: '', source: '', kind: 'single', unit: 'ml/str', doseMin: f('0,025'), doseMax: f(''), phi: f('7'), rei: f('24'), maxApps: f('3') }, F, now, 'lu'); if (!r.ok) throw new Error('setup'); return withSignOff(r.row, 'Agronomist', '2026-11-17', now)!; };
const worker: Row = { id: 'w1', farm_id: F, name: 'Γιώργος' };
const job = (over: Partial<Row> = {}): Row => ({ id: 'job1', farm_id: F, kind: 'spray', status: 'planned', product_id: 'prod', label_use_id: 'lu', worker_id: 'w1', dose_str: '0.025', dose_unit: 'ml/str', ...over });
const planting: Row = { id: 'pl', farm_id: F, crop_id: 'crop', area_str: '0.5' };

describe('the worker completes an assigned spray', () => {
  it('the record takes product, dose and label from the JOB; the applicator and the actor are the worker; the PHI comes from the signed label', () => {
    const c = completeSprayJob(job(), label(), [planting], worker, '2026-11-20T08:00:00Z', 'ok', now, 'sp1');
    expect(c).toEqual({ "job": { "done_at": "2026-11-20T08:00:00Z", "dose_str": "0.025", "dose_unit": "ml/str", "farm_id": "demo-farm", "id": "job1", "kind": "spray", "label_use_id": "lu", "product_id": "prod", "status": "done", "updated_at": "2026-11-20T10:00:00.000Z", "worker_id": "w1" }, "ok": true, "spray": { "actor_id": "w1", "applicator_id": "w1", "created_at": "2026-11-20T10:00:00.000Z", "dose_str": "0.025", "dose_unit": "ml/str", "farm_id": "demo-farm", "flags": [], "id": "sp1", "job_id": "job1", "label_state": "signed", "label_use_id": "lu", "note": "ok", "phi_days": "7", "phi_source": "label", "phi_until": "2026-11-27T08:00:00Z", "product_id": "prod", "rei_hours": "24", "rei_until": "2026-11-21T08:00:00Z", "sprayed_at": "2026-11-20T08:00:00Z" } });
  });
  it('only the assigned worker, only an open job; an unreadable time is refused', () => {
    expect(completeSprayJob(job({ worker_id: 'w2' }), label(), [planting], worker, '2026-11-20T08:00:00Z', '', now, 's')).toEqual({ ok: false });
    expect(completeSprayJob(job({ status: 'done' }), label(), [planting], worker, '2026-11-20T08:00:00Z', '', now, 's')).toEqual({ ok: false });
    expect(completeSprayJob(job(), label(), [planting], worker, 'Invalid Date', '', now, 's')).toEqual({ ok: false });
  });
  it('a weak label is still recorded and marked, with the waiting period unknown (the worker cannot change that)', () => {
    const unsigned = { ...label(), sign_off: undefined };
    const c = completeSprayJob(job(), unsigned, [planting], worker, '2026-11-20T08:00:00Z', '', now, 'sp1');
    expect(c).toEqual({ "job": { "done_at": "2026-11-20T08:00:00Z", "dose_str": "0.025", "dose_unit": "ml/str", "farm_id": "demo-farm", "id": "job1", "kind": "spray", "label_use_id": "lu", "product_id": "prod", "status": "done", "updated_at": "2026-11-20T10:00:00.000Z", "worker_id": "w1" }, "ok": true, "spray": { "actor_id": "w1", "applicator_id": "w1", "created_at": "2026-11-20T10:00:00.000Z", "dose_str": "0.025", "dose_unit": "ml/str", "farm_id": "demo-farm", "flags": [ "label_unsigned" ], "id": "sp1", "job_id": "job1", "label_state": "unsigned", "label_use_id": "lu", "product_id": "prod", "sprayed_at": "2026-11-20T08:00:00Z" } });
    expect(c.ok && 'phi_until' in c.spray).toBe(false);
  });
  it('«not done» closes the job with a reason and writes no spray', () => {
    expect(skipSprayJob(job(), worker, 'rain', now)).toEqual({ "dose_str": "0.025", "dose_unit": "ml/str", "farm_id": "demo-farm", "id": "job1", "kind": "spray", "label_use_id": "lu", "product_id": "prod", "skip_reason": "rain", "status": "skipped", "updated_at": "2026-11-20T10:00:00.000Z", "worker_id": "w1" });
    expect(skipSprayJob(job({ worker_id: 'w2' }), worker, 'rain', now)).toBeUndefined();
    expect(skipSprayJob(job({ status: 'skipped' }), worker, 'rain', now)).toBeUndefined();
  });
  it('an observation needs a parcel and a kind and carries the worker as actor', () => {
    expect(buildObservation('p1', 'pest', ' aphids ', worker, F, now, 'o1')).toEqual({ "actor_id": "w1", "created_at": "2026-11-20T10:00:00.000Z", "farm_id": "demo-farm", "id": "o1", "kind": "pest", "note": "aphids", "observed_at": "2026-11-20T10:00:00.000Z", "parcel_id": "p1" });
    expect(buildObservation('', 'pest', '', worker, F, now, 'o')).toBeUndefined();
    expect(buildObservation('p1', undefined, '', worker, F, now, 'o')).toBeUndefined();
  });
  it('a LATE end time (more than 7 days before the record) needs a reason from the worker too, and the record is marked', () => {
    const at = '2026-11-01T08:00:00Z';
    expect(completeSprayJob(job(), label(), [planting], worker, at, '', now, 'sp1')).toEqual({ ok: false });
    expect(completeSprayJob(job(), label(), [planting], worker, at, '', now, 'sp1', '  ')).toEqual({ ok: false });
    const c = completeSprayJob(job(), label(), [planting], worker, at, '', now, 'sp1', 'Ξέχασα');
    expect(c.ok && [c.spray.flags, c.spray.late_reason, c.spray.phi_until]).toEqual([['late_entry'], 'Ξέχασα', '2026-11-08T08:00:00Z']);
  });
});
