import type { Row } from '../db/schema';

// The bell (E2), computed on the phone from the job rows it already holds: no server, no push, nothing invented.
// owner: a job FINISHED after he last looked; worker: a planned job assigned to her, or an OPEN job nobody has yet (the board, B3), CREATED after she last looked.
// «Claimed» (a worker took a job) needs the job board (B3) and is not produced here. No «last look» yet = nothing is new (first run does not flood).
export interface Notice { kind: 'done' | 'new' | 'claimed'; jobId: string; at: string }
export interface NoticeWho { role: 'owner' | 'worker'; workerId?: string; seenAt: string | undefined }

const iso = (v: unknown): string | undefined => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : undefined);
const later = (a: string, b: string): boolean => Date.parse(a) > Date.parse(b);

/** `prevOpen` = the ids of the OPEN jobs (planned, nobody on them) as the owner last saw them: a job that was open then and has a worker now was TAKEN from the board («Ανέλαβε ο …»). */
export function notices(jobs: readonly Row[], who: NoticeWho, prevOpen: ReadonlySet<string> = new Set()): Notice[] {
  const { seenAt } = who;
  if (!seenAt) return [];
  const live = jobs.filter((j) => !j.deleted_at);
  const out: Notice[] = [];
  if (who.role === 'owner') {
    for (const j of live) { const at = iso(j.done_at); if (j.status === 'done' && at && later(at, seenAt)) out.push({ kind: 'done', jobId: String(j.id), at }); }
    for (const j of live) { const at = iso(j.updated_at); if (j.status === 'planned' && j.worker_id && prevOpen.has(String(j.id)) && at) out.push({ kind: 'claimed', jobId: String(j.id), at }); }
  } else if (who.workerId) {
    for (const j of live) { const at = iso(j.created_at); if (j.status === 'planned' && (j.worker_id === who.workerId || !j.worker_id) && at && later(at, seenAt)) out.push({ kind: 'new', jobId: String(j.id), at }); }
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** The ids of the open jobs (planned, no worker, not removed). */
export const openIds = (jobs: readonly Row[]): string[] => jobs.filter((j) => !j.deleted_at && j.kind === 'spray' && j.status === 'planned' && !j.worker_id).map((j) => String(j.id));
