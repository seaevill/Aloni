import { parseDecimal, type Known } from '@aloni/rules-core';
import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Ταμείο» (F1, docs/milestones/F1.md): the owner's own income/expense book. NOT official bookkeeping: no invoices, no myDATA, no tax.
// Amounts are WHOLE euro cents (no floats anywhere). Rows are append-only: a correction is a new row that amends an older one, a cancel is a void row;
// nothing is ever edited or removed, so the history stays readable. Kept on this phone per farm (`money:<farm>`) until the server table (F6).

export const INCOME = ['sale', 'subsidy', 'vat_refund', 'other_in'] as const;
export const EXPENSE = ['seed', 'fertiliser', 'ppp', 'labour', 'fuel', 'water', 'power', 'repair', 'rent', 'packaging', 'transport', 'equipment', 'fees', 'other_out'] as const;
export type Direction = 'in' | 'out';
export type Category = (typeof INCOME)[number] | (typeof EXPENSE)[number];
export const categoriesOf = (d: Direction): readonly Category[] => (d === 'in' ? INCOME : EXPENSE);

/** One row of the book. `amends` = the id of the row this one replaces; `void` = the amended row is cancelled (amount etc. copied for the history). */
export interface MoneyEntry {
  id: string; day: string; dir: Direction; category: Category; cents: number;
  crop?: string; note: string; amends?: string; void?: true; at: string;
}

export const MAX_CENTS = 99_999_999;          // 999.999,99 €: anything bigger is a typing error
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** «45,50» / «45.5» / «1200» → 4550 / 4550 / 120000 cents. Never guessed: «1.000» (thousands or decimals?), more than 2 decimals, 0, signs and text are refused. */
export function parseCents(input: string): Known<number> {
  const d = parseDecimal(input);
  if (!d.known) return d;
  const [int, frac = ''] = d.value.split('.');
  if (frac.length > 2) return { known: false, reason: 'invalid' };
  const digits = (int + frac.padEnd(2, '0')).replace(/^0+(?=\d)/, '');
  if (digits.length > 8) return { known: false, reason: 'invalid' };
  const cents = parseFloat(digits);         // a string of at most 8 digits: exact as a double
  if (!(cents > 0) || cents > MAX_CENTS) return { known: false, reason: 'invalid' };
  return { known: true, value: cents };
}

export interface EntryInput { day: string; dir: Direction; category: string; amount: string; crop?: string; note: string }
export type BuildResult = { ok: true; entry: MoneyEntry } | { ok: false; reason: 'amount' | 'day' | 'category' };

export function validDay(day: string): boolean {
  return DAY.test(day) && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().startsWith(day);
}

export function buildEntry(input: EntryInput, id: string, nowIso: string, amends?: string): BuildResult {
  const amount = parseCents(input.amount);
  if (!amount.known) return { ok: false, reason: 'amount' };
  if (!validDay(input.day)) return { ok: false, reason: 'day' };
  if (!(categoriesOf(input.dir) as readonly string[]).includes(input.category)) return { ok: false, reason: 'category' };
  const entry: MoneyEntry = { id, day: input.day, dir: input.dir, category: input.category as Category, cents: amount.value, note: input.note.trim(), at: nowIso };
  if (input.crop !== undefined && input.crop !== '') entry.crop = input.crop;
  if (amends !== undefined) entry.amends = amends;
  return { ok: true, entry };
}

/** A cancel row for `target`: same values (kept for the history), `void: true`. */
export function voidOf(target: MoneyEntry, id: string, nowIso: string): MoneyEntry {
  const v: MoneyEntry = { id, day: target.day, dir: target.dir, category: target.category, cents: target.cents, note: target.note, amends: target.id, void: true, at: nowIso };
  if (target.crop !== undefined) v.crop = target.crop;
  return v;
}

/** «Αναίρεση» of a cancel: a row that amends the void row with the original values, so the entry counts again (nothing is removed). */
export function restoreOf(voidRow: MoneyEntry, id: string, nowIso: string): MoneyEntry {
  const r: MoneyEntry = { id, day: voidRow.day, dir: voidRow.dir, category: voidRow.category, cents: voidRow.cents, note: voidRow.note, amends: voidRow.id, at: nowIso };
  if (voidRow.crop !== undefined) r.crop = voidRow.crop;
  return r;
}

/** The rows that count: every row nobody amended, minus void rows. A row amended twice: the newest amendment wins (by `at`, then id). */
export function effective(rows: readonly MoneyEntry[]): MoneyEntry[] {
  const replaced = new Map<string, MoneyEntry>();
  for (const r of rows) {
    if (r.amends === undefined) continue;
    const prev = replaced.get(r.amends);
    if (prev === undefined || prev.at < r.at || (prev.at === r.at && prev.id < r.id)) replaced.set(r.amends, r);
  }
  const resolve = (r: MoneyEntry, seen: Set<string>): MoneyEntry | undefined => {
    const next = replaced.get(r.id);
    if (next === undefined || seen.has(next.id)) return r.void ? undefined : r;
    seen.add(next.id);
    return resolve(next, seen);
  };
  const out: MoneyEntry[] = [];
  for (const r of rows) if (r.amends === undefined) { const e = resolve(r, new Set([r.id])); if (e) out.push(e); }
  return out.sort((a, b) => b.at.localeCompare(a.at)).sort((a, b) => b.day.localeCompare(a.day));   // stable sort: newest day first, then newest written
}

/** The chain of one original row, oldest first (for the entry sheet's history). */
export function historyOf(rows: readonly MoneyEntry[], originalId: string): MoneyEntry[] {
  const chain: MoneyEntry[] = [];
  const first = rows.find((r) => r.id === originalId);
  if (!first) return chain;
  const ids = new Set([first.id]);
  chain.push(first);
  for (let grew = true; grew;) {
    grew = false;
    for (const r of rows) if (r.amends !== undefined && ids.has(r.amends) && !ids.has(r.id)) { ids.add(r.id); chain.push(r); grew = true; }
  }
  return chain.sort((a, b) => a.id.localeCompare(b.id)).sort((a, b) => a.at.localeCompare(b.at));
}

/** The id of the original row a (possibly amended) entry belongs to. */
export function rootOf(rows: readonly MoneyEntry[], entry: MoneyEntry): string {
  let cur = entry; const seen = new Set<string>();
  while (cur.amends !== undefined && !seen.has(cur.id)) { seen.add(cur.id); const up = rows.find((r) => r.id === cur.amends); if (!up) break; cur = up; }
  return cur.id;
}

export interface Totals { inCents: number; outCents: number; netCents: number }
export interface YearSummary extends Totals { year: string; months: Totals[]; byCategory: Array<{ dir: Direction; category: Category; cents: number }> }

export const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const totals = (inCents: number, outCents: number): Totals => ({ inCents, outCents, netCents: inCents - outCents });

/** In, out and net of one calendar year, the 12 months (January first) and each category (biggest first). Integer sums only. */
export function yearSummary(rows: readonly MoneyEntry[], year: string): YearSummary {
  const live = effective(rows).filter((e) => e.day.startsWith(`${year}-`));
  const ins = Array.from({ length: 12 }, () => 0); const outs = Array.from({ length: 12 }, () => 0);
  const cats = new Map<string, { dir: Direction; category: Category; cents: number }>();
  for (const e of live) {
    const m = MONTHS.indexOf(e.day.split('-')[1]);
    if (m < 0) continue;
    if (e.dir === 'in') ins[m] += e.cents; else outs[m] += e.cents;
    const k = `${e.dir}:${e.category}`;
    const c = cats.get(k);
    if (c) c.cents += e.cents; else cats.set(k, { dir: e.dir, category: e.category, cents: e.cents });
  }
  const inCents = ins.reduce((a, b) => a + b, 0); const outCents = outs.reduce((a, b) => a + b, 0);
  return { year, ...totals(inCents, outCents), months: ins.map((v, i) => totals(v, outs[i])), byCategory: [...cats.values()].sort((a, b) => a.category.localeCompare(b.category)).sort((a, b) => b.cents - a.cents) };
}

/** Years that have at least one counted entry, newest first; the current year is always offered. */
export function yearsOf(rows: readonly MoneyEntry[], thisYear: string): string[] {
  return [...new Set([thisYear, ...effective(rows).map((e) => e.day.slice(0, 4))])].sort((a, b) => b.localeCompare(a));
}

const key = (farm: string): string => `money:${farm}`;
export async function loadMoney(db: AppDB, farm: string): Promise<MoneyEntry[]> {
  const v = (await db.settings.get(key(farm)))?.value;
  return Array.isArray(v) ? (v as MoneyEntry[]) : [];
}
/** Appends one row. There is deliberately no update or delete function. */
export async function appendMoney(db: AppDB, farm: string, entry: MoneyEntry): Promise<void> {
  const rows = await loadMoney(db, farm);
  if (rows.some((r) => r.id === entry.id)) throw new Error('duplicate id');
  if (entry.amends !== undefined && !rows.some((r) => r.id === entry.amends)) throw new Error('amends a missing row');
  await putLocal(db, key(farm), [...rows, entry]);
}
