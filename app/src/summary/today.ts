import { addDecimal, parseDecimal, parseWhole, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { effectiveSprays } from '../spray/spray';

// «Who did what today» for the owner: the sprayings finished today (by whom), the crates cut today (exact sum, as typed), and the jobs that were planned for an earlier day and are still open.
// Information only: nothing here decides or warns. «Today» is the Athens calendar day.
const ATHENS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayOf = (iso: unknown): string => { if (typeof iso !== 'string') return ''; const ms = Date.parse(iso); return Number.isNaN(ms) ? '' : ATHENS_DAY.format(new Date(ms)); };

export interface DoneLine { sprayId: string; worker: string; product: string; at: string }
export interface TodaySummary { done: DoneLine[]; crates: string; harvests: number; overdue: Row[] }

export function todaySummary(today: string, sprays: readonly Row[], harvests: readonly Row[], jobs: readonly Row[], workerName: (id: unknown) => string, productName: (id: unknown) => string): TodaySummary {
  const done = effectiveSprays([...sprays]).filter((s) => dayOf(s.sprayed_at) === today)
    .map((s) => ({ sprayId: String(s.id), worker: workerName(s.applicator_id), product: productName(s.product_id), at: String(s.sprayed_at) }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const cut = harvests.filter((h) => !h.deleted_at && dayOf(h.harvested_at) === today);
  let sum = '0' as Decimal | string;
  for (const h of cut) { const q = parseDecimal(String(h.crates_str ?? '')); if (q.known) sum = addDecimal(sum as Decimal, q.value); }
  const overdue = jobs.filter((j) => !j.deleted_at && j.kind === 'spray' && j.status === 'planned' && typeof j.planned_for === 'string' && j.planned_for < today);
  return { done, crates: String(sum), harvests: cut.length, overdue };
}

/** The crates cut (logged harvests, whole crates) in the last `days` days up to `nowIso`; an entry with an unreadable crate count or time counts for nothing. */
export function cutCrates(harvests: readonly Row[], nowIso: string, days: number): number {
  const since = new Date(Date.parse(nowIso) - days * 86_400_000).toISOString();
  let sum = Number('0');
  for (const h of harvests) {
    const n = parseWhole<'Crates'>(typeof h.crates_str === 'string' ? h.crates_str : '');
    const at = typeof h.harvested_at === 'string' ? h.harvested_at : '';
    if (n.known && at >= since && at <= nowIso) sum += n.value;
  }
  return sum;
}
