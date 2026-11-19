import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { buildLabelUse, withSignOff, type LabelUseInput } from '../../src/labels/label-use';
import { buildJob, type JobInput } from '../../src/spray/plan';

const F = '11111111-1111-4111-8111-111111111111';
const IDS = { job: 'j1', plantingLinks: ['jp1'] };
const planting: Row = { id: 'pl1', farm_id: F, crop_id: 'spinach', parcel_id: 'pa1', area_str: '0.25' };
const ok: JobInput = { plantingIds: ['pl1'], productId: 'pr1', workerId: 'w1', dose: '0,025', doseUnit: 'ml/str', plannedFor: '2026-11-20' };
const now = '2026-11-19T08:00:00.000Z';
const field = (text: string) => ({ notOnLabel: false, text });
const luInput = (over: Partial<LabelUseInput> = {}): LabelUseInput => ({ productId: 'pr1', cropId: 'spinach', target: '', source: '', kind: 'single', unit: 'ml/str', doseMin: field('0,025'), doseMax: field(''), phi: field('7'), rei: field('24'), maxApps: field('3'), ...over });
const unsignedLabel = (over: Partial<LabelUseInput> = {}): Row => { const r = buildLabelUse(luInput(over), F, now, 'lu1'); if (!r.ok) throw new Error('setup'); return r.row; };
const signed = (over: Partial<LabelUseInput> = {}): Row => withSignOff(unsignedLabel(over), 'Agronomist', '2026-11-17', now)!;

describe('planning a spray job for a worker', () => {
  it('REFUSES a job for a crop with no label data (none) — «Δεν μπορείτε να αναθέσετε» — and for a blocked label; an unsigned or signed one is allowed', () => {
    expect(buildJob(ok, { label: undefined, plantings: [planting] }, F, 'n', IDS)).toMatchObject({ ok: false, errors: { label: true } });
    const blocked = unsignedLabel({ phi: { notOnLabel: true, text: '' } });
    expect(buildJob(ok, { label: blocked, plantings: [planting] }, F, 'n', IDS)).toMatchObject({ ok: false, errors: { label: true } });
    expect(buildJob(ok, { label: signed(), plantings: [planting] }, F, 'n', IDS).ok).toBe(true);
  });

  it('fixes product, dose (as typed), unit, worker, day and the plantings; the worker supplies none of it', () => {
    const r = buildJob(ok, { label: unsignedLabel(), plantings: [planting] }, F, '2026-11-19T08:00:00Z', IDS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.job).toMatchObject({ kind: 'spray', status: 'planned', product_id: 'pr1', worker_id: 'w1', dose_str: '0.025', dose_unit: 'ml/str', planned_for: '2026-11-20' });
    expect(r.flags).toEqual(['label_unsigned']);          // an unsigned label is said out loud
    expect(r.jobPlantings).toEqual([{ id: 'jp1', farm_id: F, job_id: 'j1', planting_id: 'pl1', area_str_treated: '0.25', created_at: '2026-11-19T08:00:00Z' }]);
  });

  it('refuses what is missing, one reason per field; a dose of 0 or text is not a dose; the unit must be chosen', () => {
    const bad = buildJob({ plantingIds: [], productId: '', workerId: '', dose: '0', doseUnit: undefined, plannedFor: '' }, { label: undefined, plantings: [] }, F, 'n', IDS);
    expect(bad).toEqual({ ok: false, errors: { plantings: true, product: true, worker: true, dose: true, doseUnit: true, plannedFor: true, label: true } });
    expect(buildJob({ ...ok, dose: 'abc' }, { label: undefined, plantings: [planting] }, F, 'n', IDS).ok).toBe(false);
  });

  it('names the signed label use; a dose outside the label or in another unit is marked, never silently accepted', () => {
    const c = { label: signed(), plantings: [planting] };
    const good = buildJob(ok, c, F, 'n', IDS);
    expect(good.ok && good.job.label_use_id).toBe('lu1');
    expect(good.ok && good.flags).toEqual([]);
    expect(buildJob({ ...ok, dose: '0,05' }, c, F, 'n', IDS)).toMatchObject({ ok: true, flags: ['dose_outside_label'] });
    expect(buildJob({ ...ok, doseUnit: 'g/str' }, c, F, 'n', IDS)).toMatchObject({ ok: true, flags: ['dose_unit_differs'] });
  });

  it('an unsigned label is marked unsigned; a label of another crop is not used', () => {
    expect(buildJob(ok, { label: unsignedLabel(), plantings: [planting] }, F, 'n', IDS)).toMatchObject({ ok: true, flags: ['label_unsigned'] });
    const other = buildJob(ok, { label: signed({ cropId: 'rocket' }), plantings: [planting] }, F, 'n', IDS);
    expect(other).toMatchObject({ ok: false, errors: { label: true } });      // a label of another crop is no label for this one
  });
});
