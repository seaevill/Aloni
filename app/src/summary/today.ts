import { addDecimal, parseDecimal, parseWhole, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { effectiveSprays } from '../spray/spray';

// «Who did what today» for the owner: the sprayings finished today (by whom), the crates cut today (exact sum, as typed), and the jobs that were planned for an earlier day and are still open.
// Information only: nothing here decides or warns. «Today» is the Athens calendar day.
const ATHENS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = (iso: unknown): string => { if (typeof iso !== 'string') return ''; const ms = Date.parse(iso); return Number.isNaN(ms) ? '' : ATHENS_DAY.format(new Date(ms)); };

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

/** Whole crates LOGGED per Athens day for the last `days` days up to `nowIso`, oldest first. A day with no readable log is `null` (a gap), never 0: nobody logged it. A logged «0» stays 0. */
export function cratesPerDay(harvests: readonly Row[], nowIso: string, days: number): Array<number | null> {
  const base = Date.parse(`${dayOf(nowIso)}T12:00:00Z`);
  if (Number.isNaN(base)) return [];
  const keys = Array.from({ length: days }, (_, i) => new Date(base - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const sums = new Map<string, number>();
  for (const h of harvests) {
    const n = parseWhole<'Crates'>(typeof h.crates_str === 'string' ? h.crates_str : '');
    const key = dayOf(h.harvested_at);
    if (!n.known || key === '') continue;
    const before = sums.get(key);
    if (before === undefined) sums.set(key, n.value); else sums.set(key, before + n.value);
  }
  return keys.map((k) => sums.get(k) ?? null);
}

/** The exact crates logged in the window, or `undefined` when nothing readable was logged in it (the screen then says «άγνωστο», not 0). */
export function cratesLogged(harvests: readonly Row[], nowIso: string, days: number): number | undefined {
  const known = cratesPerDay(harvests, nowIso, days).filter((v): v is number => v !== null);
  return known.length === 0 ? undefined : known.reduce((a, b) => a + b);
}

export interface DoneRecord {
  kind: 'spray' | 'harvest'; id: string; at: string;
  cropId: string; parcelId: string;
  worker: string; product: string; productId: string;
  /** exact crates as typed; undefined = not readable (the screen writes why) */ crates: string | undefined;
  /** only what the record itself says; no `destination` on the record = unknown (old record) */ destination: 'store' | 'dispatch' | undefined;
}

/** Every record made today (Athens day), sprays and harvests together, oldest first: what it was, where, and (spray) the product or (harvest) the crates and where they went. Information only. */
export function doneRecords(
  today: string, sprays: readonly Row[], harvests: readonly Row[], jobs: readonly Row[], links: readonly Row[], plantings: readonly Row[],
  workerName: (id: unknown) => string, productName: (id: unknown) => string,
): DoneRecord[] {
  const out: DoneRecord[] = [];
  const planting = (id: unknown): Row | undefined => plantings.find((p) => p.id === id);
  for (const s of effectiveSprays([...sprays]).filter((x) => dayOf(x.sprayed_at) === today)) {
    const link = links.find((l) => l.job_id === s.job_id); const p = planting(link?.planting_id);
    out.push({ kind: 'spray', id: String(s.id), at: String(s.sprayed_at), cropId: String(p?.crop_id ?? ''), parcelId: String(p?.parcel_id ?? ''), worker: workerName(s.applicator_id), product: productName(s.product_id), productId: String(s.product_id ?? ''), crates: undefined, destination: undefined });
  }
  for (const h of harvests.filter((x) => !x.deleted_at && dayOf(x.harvested_at) === today)) {
    const p = planting(h.planting_id); const n = parseWhole<'Crates'>(typeof h.crates_str === 'string' ? h.crates_str : '');
    const job = jobs.find((j) => j.id === h.job_id);
    out.push({ kind: 'harvest', id: String(h.id), at: String(h.harvested_at), cropId: String(p?.crop_id ?? ''), parcelId: String(p?.parcel_id ?? ''), worker: workerName(h.cut_by ?? job?.worker_id), product: '', productId: '', crates: n.known ? String(n.value) : undefined, destination: h.destination === 'store' || h.destination === 'dispatch' ? h.destination : undefined });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
