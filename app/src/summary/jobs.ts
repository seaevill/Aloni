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
