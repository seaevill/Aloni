import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// The open spray jobs, grouped for the foreman (T9): «Καθυστερημένες» (planned for an earlier day), «Σήμερα», «Αύριο», later. `today` is the Athens calendar day (YYYY-MM-DD).
export interface JobGroups { overdue: Row[]; today: Row[]; tomorrow: Row[]; later: Row[] }
const DAY_MS = 86_400_000;
export const nextDay = (day: string): string => new Date(Date.parse(`${day}T12:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

/** Whole calendar days a job is late (planned day before `today`); undefined when it is not late or a day is unreadable (never 0, never a guess). Both are Athens calendar days (YYYY-MM-DD). */
export function daysLate(plannedFor: string, today: string): number | undefined {
  const a = Date.parse(`${plannedFor}T12:00:00Z`); const b = Date.parse(`${today}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedFor) || !/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(a) || Number.isNaN(b) || a >= b) return undefined;
  return (b - a) / DAY_MS;
}

export function groupJobs(jobs: readonly Row[], today: string): JobGroups {
  const g: JobGroups = { overdue: [], today: [], tomorrow: [], later: [] };
  const tomorrow = nextDay(today);
  for (const j of [...jobs].sort((a, b) => String(a.planned_for ?? '').localeCompare(String(b.planned_for ?? '')))) {
    const d = typeof j.planned_for === 'string' ? j.planned_for : '';
    if (d !== '' && d < today) g.overdue.push(j);
    else if (d === today || d === '') g.today.push(j);        // a job without a date is today's work, never lost
    else if (d === tomorrow) g.tomorrow.push(j);
    else g.later.push(j);
  }
  return g;
}

export interface JobHub { open: JobGroups; doneToday: Row[]; counts: { overdue: number; today: number; upcoming: number; doneToday: number } }
const athensDay = (instant: string): string | undefined => {
  const ms = Date.parse(instant);
  return Number.isFinite(ms) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)) : undefined;
};

/** The «Εργασίες» summary of Σήμερα: the open sprayings in their groups plus the ones DONE today (the Athens day), oldest first. Removed jobs and jobs that are not sprayings never count. Counting only: nothing is decided here. */
export function jobHub(jobs: readonly Row[], today: string): JobHub {
  const live = jobs.filter((j) => !j.deleted_at);          // EVERY kind of job (spray, fertilise, irrigate, sow, harvest, other): nothing is hidden because a screen was built for sprayings first
  const open = groupJobs(live.filter((j) => j.status === 'planned'), today);
  const doneToday = live.filter((j) => j.status === 'done' && typeof j.done_at === 'string' && athensDay(j.done_at) === today).sort((a, b) => String(a.done_at).localeCompare(String(b.done_at)));
  return { open, doneToday, counts: { overdue: open.overdue.length, today: open.today.length, upcoming: open.tomorrow.length + open.later.length, doneToday: doneToday.length } };
}

// ---- Εργασίες → one job's detail ----
export interface JobDetailRows { jobs: readonly Row[]; links: readonly Row[]; plantings: readonly Row[]; sprays: readonly Row[]; harvests: readonly Row[] }
export interface JobDetail {
  id: string; kind: string; plannedFor: string | undefined; late: boolean; status: string; productId: string | undefined; workerId: string | undefined;
  plantings: Array<{ id: string; cropId: string; parcelId: string }>;
  spray: { id: string; at: string } | undefined;
  harvests: Array<{ id: string; at: string; crates: number | undefined }>;
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** One job for its detail sheet: the day (and whether it is late), the plantings it covers, the product, who it was given to, the spray record made for it, and the harvests logged on the same plantings since the planned day (newest first; an unreadable count is kept, never 0). Removed or unknown = undefined. */
export function jobDetail(jobId: string, rows: JobDetailRows, today: string): JobDetail | undefined {
  const job = rows.jobs.find((j) => j.id === jobId && !j.deleted_at);
  if (!job) return undefined;
  const plannedFor = str(job.planned_for) === '' ? undefined : str(job.planned_for);
  const status = str(job.status);
  const late = status === 'planned' && plannedFor !== undefined && plannedFor < today;
  const plantings = rows.links.filter((l) => l.job_id === jobId).map((l) => rows.plantings.find((p) => p.id === l.planting_id)).filter((p): p is Row => !!p)
    .map((p) => ({ id: str(p.id), cropId: str(p.crop_id), parcelId: str(p.parcel_id) }));
  const sprayRow = rows.sprays.find((s) => s.job_id === jobId);
  const ids = new Set(plantings.map((p) => p.id));
  const harvests = rows.harvests.filter((h) => ids.has(str(h.planting_id)) && (plannedFor === undefined || athensDay(str(h.harvested_at)) !== undefined && (athensDay(str(h.harvested_at)) ?? '') >= plannedFor))
    .sort((a, b) => str(b.harvested_at).localeCompare(str(a.harvested_at)))
    .map((h) => { const n = parseWhole<'Crates'>(str(h.crates_str)); return { id: str(h.id), at: str(h.harvested_at), crates: n.known ? n.value : undefined }; });
  return { id: jobId, kind: str(job.kind), plannedFor, late, status, productId: str(job.product_id) === '' ? undefined : str(job.product_id), workerId: str(job.worker_id) === '' ? undefined : str(job.worker_id), plantings, spray: sprayRow ? { id: str(sprayRow.id), at: str(sprayRow.sprayed_at) } : undefined, harvests };
}
