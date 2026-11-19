import { compareDecimal, parseDecimal, type Decimal, type DoseUnit } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { DOSE_UNITS, readUse, statusOf } from '../labels/label-use';
import type { Flag } from './spray';

// PLANNING a spray job for a worker (the owner): everything the worker will do is fixed HERE — plantings, product, the signed label use, dose, unit, who. The worker cannot change any of it.
// The app suggests, never chooses: the dose is typed by the owner (the label's own dose is only offered as a start by the form); a weak label is marked on the job, never silently accepted.

export interface JobInput { plantingIds: readonly string[]; productId: string; workerId: string; dose: string; doseUnit: DoseUnit | undefined; plannedFor: string }
export interface JobErrors { plantings: boolean; product: boolean; worker: boolean; dose: boolean; doseUnit: boolean; plannedFor: boolean; /** no label data (none or blocked) for this crop: a job cannot be planned for it */ label: boolean }
export type JobResult = { ok: true; job: Row; jobPlantings: Row[]; flags: Flag[] } | { ok: false; errors: JobErrors };
export interface JobIds { job: string; plantingLinks: readonly string[] }
const LABEL_FLAG = { none: 'label_none', blocked: 'label_blocked', unsigned: 'label_unsigned', changed: 'label_changed' } as const;

export function buildJob(input: JobInput, ctx: { label: Row | undefined; plantings: readonly Row[] }, farmId: string, nowIso: string, ids: JobIds): JobResult {
  const dose = parseDecimal(input.dose);
  const positive: Decimal | undefined = dose.known && compareDecimal(dose.value, '0' as Decimal) > 0 ? dose.value : undefined;
  const errors: JobErrors = {
    plantings: input.plantingIds.length === 0, product: !input.productId, worker: !input.workerId, dose: !positive,
    doseUnit: !input.doseUnit || !DOSE_UNITS.includes(input.doseUnit), plannedFor: !/^\d{4}-\d{2}-\d{2}$/.test(input.plannedFor), label: false,
  };
  const label0 = ctx.label && ctx.label.product_id === input.productId && ctx.plantings.every((p) => p.crop_id === ctx.label?.crop_id) ? ctx.label : undefined;
  const st0 = label0 ? statusOf(label0) : 'none';
  errors.label = st0 === 'none' || st0 === 'blocked';      // the app never plans a spray for a crop it has no complete label data for (recording one that already happened stays possible)
  if (Object.values(errors).some(Boolean) || !positive || !input.doseUnit) return { ok: false, errors };
  const label = ctx.label && ctx.label.product_id === input.productId && ctx.plantings.every((p) => p.crop_id === ctx.label?.crop_id) ? ctx.label : undefined;
  const state = label ? statusOf(label) : 'none';
  const flags: Flag[] = state === 'signed' ? [] : [LABEL_FLAG[state]];
  if (label) {
    const u = readUse(label);
    if (u.dose.known) {
      if (u.dose.value.unit !== input.doseUnit) flags.push('dose_unit_differs');
      else if (compareDecimal(positive, u.dose.value.min) < 0 || compareDecimal(positive, u.dose.value.max) > 0) flags.push('dose_outside_label');
    }
  }
  const job: Row = { id: ids.job, farm_id: farmId, kind: 'spray', status: 'planned', product_id: input.productId, worker_id: input.workerId, dose_str: positive, dose_unit: input.doseUnit, planned_for: input.plannedFor, created_at: nowIso, updated_at: nowIso, deleted_at: null, ...(label ? { label_use_id: label.id } : {}) };
  const jobPlantings = input.plantingIds.map((pid, i) => ({ id: ids.plantingLinks[i], farm_id: farmId, job_id: ids.job, planting_id: pid, area_str_treated: ctx.plantings.find((p) => p.id === pid)?.area_str, created_at: nowIso }));
  return { ok: true, job, jobPlantings, flags };
}
