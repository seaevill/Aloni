import type { Row } from '../db/schema';

/** A worker on the roster: a NAME and nothing else (no certificate, phone, photo or location: Bora's rule, no extra personal data until the lawyer answers). */
export type WorkerResult = { ok: true; row: Row } | { ok: false };

export function buildWorker(name: string, farmId: string, nowIso: string, id: string): WorkerResult {
  const n = name.trim();
  if (!n) return { ok: false };
  return { ok: true, row: { id, farm_id: farmId, name: n, created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}
