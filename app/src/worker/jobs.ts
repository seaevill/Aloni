import type { DoseUnit } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { buildSpray } from '../spray/spray';

// The worker's side of an assigned spray. The OWNER fixed the product, the label use, the dose and the plantings; the worker only says «done» (with a
// time and a note) or «not done» (with a reason). Nothing here accepts a product or a dose from the worker.

export const SKIP_REASONS = ['rain', 'wind', 'no_product', 'other'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

export type Completion = { ok: true; job: Row; spray: Row } | { ok: false };

/** «Έγινε»: the spray record is built from the JOB's own product, dose and label use; the applicator and the actor are the worker. */
export function completeSprayJob(job: Row, label: Row | undefined, plantings: readonly Row[], worker: Row, sprayedAt: string, note: string, nowIso: string, sprayId: string, lateReason?: string, startedAt?: string): Completion {
  if (job.status !== 'planned' || job.worker_id !== worker.id) return { ok: false }; // only the assigned worker, only a job that is still open
  const r = buildSpray(
    { plantingIds: plantings.map((p) => p.id), productId: String(job.product_id), applicatorId: worker.id, sprayedAt, dose: String(job.dose_str), doseUnit: job.dose_unit as DoseUnit, lotKey: undefined, qty: '', water: '', note, lateReason, startedAt },
    { label, plantings, lot: undefined, lotBalance: undefined, today: sprayedAt.split('T')[0], startOptional: true },
    job.farm_id, nowIso, { job: job.id, spray: sprayId, movement: sprayId, plantingLinks: plantings.map((p) => p.id) },
  );
  if (!r.ok) return { ok: false };
  return { ok: true, job: { ...job, status: 'done', done_at: sprayedAt, updated_at: nowIso }, spray: { ...r.spray, actor_id: worker.id } };
}

/** «Δεν έγινε»: the job is closed with a reason; no spray record exists. */
export function skipSprayJob(job: Row, worker: Row, reason: SkipReason, nowIso: string): Row | undefined {
  return job.status === 'planned' && job.worker_id === worker.id ? { ...job, status: 'skipped', skip_reason: reason, updated_at: nowIso } : undefined;
}

export const OBSERVATION_KINDS = ['dew', 'frost_damage', 'disease', 'pest', 'other'] as const;
export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

/** An observation by a worker: which parcel, what kind, an optional note. Append-only. */
export function buildObservation(parcelId: string, kind: ObservationKind | undefined, note: string, worker: Row, farmId: string, nowIso: string, id: string): Row | undefined {
  if (!parcelId || !kind) return undefined;
  return { id, farm_id: farmId, parcel_id: parcelId, kind, observed_at: nowIso, created_at: nowIso, actor_id: worker.id, ...(note.trim() ? { note: note.trim() } : {}) };
}
