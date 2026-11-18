import type { AppDB } from '../db/schema';
import { putRpc } from '../repo';

/** The worker's «Έγινε» on a REAL farm is a call to the server (complete_spray_job): the SERVER writes the spray record from the job's fixed values and the verified account. */
export const COMPLETE = 'complete_spray_job';
export const completionArgs = (jobId: string, endedAt: string, note: string, lateReason: string): Record<string, unknown> =>
  ({ p_job: jobId, p_ended_at: endedAt, p_note: note.trim() || null, p_late_reason: lateReason.trim() || null });
/** Queued like a record: it survives a closed app and a missing signal, and is sent (once; the server answers a repeat with the same record) when the phone has a connection. */
export const queueCompletion = (db: AppDB, farmId: string, jobId: string, endedAt: string, note: string, lateReason: string): Promise<void> =>
  putRpc(db, farmId, COMPLETE, jobId, completionArgs(jobId, endedAt, note, lateReason));
