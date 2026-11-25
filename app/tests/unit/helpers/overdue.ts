import { todaySummary } from '../../../src/summary/today';
import type { Row } from '../../../src/db/schema';

/** How many overdue jobs «who did what today» reports for these jobs (no sprays, no harvests). */
export function summaryOverdueFor(jobs: readonly Row[], today: string): number {
  return todaySummary(today, [], [], jobs, () => '', () => '').overdue.length;
}
