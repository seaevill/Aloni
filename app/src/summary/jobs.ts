import type { Row } from '../db/schema';

// The open spray jobs, grouped for the foreman (T9): «Καθυστερημένες» (planned for an earlier day), «Σήμερα», «Αύριο», later. `today` is the Athens calendar day (YYYY-MM-DD).
export interface JobGroups { overdue: Row[]; today: Row[]; tomorrow: Row[]; later: Row[] }
const DAY_MS = 86_400_000;
export const nextDay = (day: string): string => new Date(Date.parse(`${day}T12:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

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
  const live = jobs.filter((j) => !j.deleted_at && j.kind === 'spray');
  const open = groupJobs(live.filter((j) => j.status === 'planned'), today);
  const doneToday = live.filter((j) => j.status === 'done' && typeof j.done_at === 'string' && athensDay(j.done_at) === today).sort((a, b) => String(a.done_at).localeCompare(String(b.done_at)));
  return { open, doneToday, counts: { overdue: open.overdue.length, today: open.today.length, upcoming: open.tomorrow.length + open.later.length, doneToday: doneToday.length } };
}
