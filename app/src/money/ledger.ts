import { parseDecimal, parseWhole, type Known } from '@aloni/rules-core';
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
  /** Veresiye: the id of a customer (never a name) and `owed: true` = the crates were sold but not paid yet. Only a sale can be owed; paying writes an amending row without `owed`. */
  customer?: string; owed?: true;
  /** Whole crates sold (a sale only). With the customer and the crop it gives the price per crate for the next sale; the total is never split by rounding. */
  crates?: number;
}

export const MAX_CRATES = 9999;
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

export interface EntryInput { day: string; dir: Direction; category: string; amount: string; crop?: string; note: string; customer?: string; owed?: boolean; crates?: string }
export type BuildResult = { ok: true; entry: MoneyEntry } | { ok: false; reason: 'amount' | 'day' | 'category' | 'customer' | 'crates' };

export function validDay(day: string): boolean {
  return DAY.test(day) && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().startsWith(day);
}

export const FIRST_DAY = '2000-01-01';                          // earlier than this is a typing error
const dayAfter = (iso: string, days: number): string => { const t = Date.parse(`${iso.slice(0, 10)}T12:00:00Z`); return Number.isFinite(t) ? new Date(t + days * 86_400_000).toISOString().slice(0, 10) : '9999-12-31'; };   // an unreadable clock sets no upper bound

export function buildEntry(input: EntryInput, id: string, nowIso: string, amends?: string): BuildResult {
  const amount = parseCents(input.amount);
  if (!amount.known) return { ok: false, reason: 'amount' };
  if (!validDay(input.day) || input.day < FIRST_DAY || input.day > dayAfter(nowIso, 366)) return { ok: false, reason: 'day' };   // a typo like 2062 must not open a new year
  if (!(categoriesOf(input.dir) as readonly string[]).includes(input.category)) return { ok: false, reason: 'category' };
  const isSale = input.dir === 'in' && input.category === 'sale';
  const customer = isSale && input.customer !== undefined && input.customer !== '' ? input.customer : undefined;   // a customer is kept on a sale only
  if (input.owed === true && customer === undefined) return { ok: false, reason: 'customer' };                      // «not paid» needs to say who owes, and only a sale can be owed
  const given = isSale ? (input.crates ?? '').trim() : '';                                                           // a crate count is kept on a sale only
  const parsed = given === '' ? undefined : parseWhole<'Crates'>(given);                                          // whole crates only: «2,5», 0, signs and text are refused
  if (parsed !== undefined && (!parsed.known || parsed.value <= 0)) return { ok: false, reason: 'crates' };
  const entry: MoneyEntry = { id, day: input.day, dir: input.dir, category: input.category as Category, cents: amount.value, note: input.note.trim().slice(0, 80), at: nowIso };
  if (input.crop !== undefined && input.crop !== '') entry.crop = input.crop;
  if (customer !== undefined) entry.customer = customer;
  if (parsed !== undefined && parsed.known) entry.crates = parsed.value;
  if (input.owed === true) entry.owed = true;
  if (amends !== undefined) entry.amends = amends;
  return { ok: true, entry };
}

/** A cancel row for `target`: same values (kept for the history), `void: true`. */
export function voidOf(target: MoneyEntry, id: string, nowIso: string): MoneyEntry {
  const v: MoneyEntry = { id, day: target.day, dir: target.dir, category: target.category, cents: target.cents, note: target.note, amends: target.id, void: true, at: nowIso };
  if (target.crop !== undefined) v.crop = target.crop;
  if (target.customer !== undefined) v.customer = target.customer;
  if (target.crates !== undefined) v.crates = target.crates;
  if (target.owed === true) v.owed = true;
  return v;
}

/** «Αναίρεση» of a cancel: a row that amends the void row with the original values, so the entry counts again (nothing is removed). */
export function restoreOf(voidRow: MoneyEntry, id: string, nowIso: string): MoneyEntry {
  const r: MoneyEntry = { id, day: voidRow.day, dir: voidRow.dir, category: voidRow.category, cents: voidRow.cents, note: voidRow.note, amends: voidRow.id, at: nowIso };
  if (voidRow.crop !== undefined) r.crop = voidRow.crop;
  if (voidRow.customer !== undefined) r.customer = voidRow.customer;
  if (voidRow.crates !== undefined) r.crates = voidRow.crates;
  if (voidRow.owed === true) r.owed = true;
  return r;
}

/** «Πληρώθηκε»: a row that amends the unpaid sale with the same values and no `owed`. The sale stays ONE income row (a payment never writes a second one), so no total changes. */
export function settleOf(target: MoneyEntry, id: string, nowIso: string): MoneyEntry {
  const p: MoneyEntry = { id, day: target.day, dir: target.dir, category: target.category, cents: target.cents, note: target.note, amends: target.id, at: nowIso };
  if (target.crop !== undefined) p.crop = target.crop;
  if (target.customer !== undefined) p.customer = target.customer;
  if (target.crates !== undefined) p.crates = target.crates;
  return p;
}

/** The newest price per crate (whole cents) of this customer and crop: from the counted sales that carry both and a crate count. A sale whose total does not split into whole cents per crate is skipped (nothing is rounded); none = unknown. */
export function lastCratePrice(rows: readonly MoneyEntry[], customer: string, crop: string): { cents: number; day: string } | undefined {
  if (customer === '' || crop === '') return undefined;
  const hit = effective(rows).find((e) => e.dir === 'in' && e.category === 'sale' && e.customer === customer && e.crop === crop && e.crates !== undefined && Number.isInteger(e.cents / e.crates));   // `effective` lists the newest day first
  return hit && hit.crates !== undefined ? { cents: hit.cents / hit.crates, day: hit.day } : undefined;
}

/** crates × price per crate in whole cents; a bad count or a result over the book limit gives nothing. */
export function cratesTimesPrice(priceCents: number, crates: number): number | undefined {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isSafeInteger(crates) || crates <= 0 || crates > MAX_CRATES) return undefined;
  const total = priceCents * crates;
  return total <= MAX_CENTS ? total : undefined;
}

export interface OwedLine { customer: string; cents: number; count: number }
/** What customers still owe: the counted rows with `owed`, per customer (biggest first) and in total. Integer sums only. */
export function owedByCustomer(rows: readonly MoneyEntry[]): { byCustomer: OwedLine[]; totalCents: number } {
  const per = new Map<string, OwedLine>();
  let totalCents = 0;
  for (const e of effective(rows)) {
    if (e.owed !== true || e.customer === undefined) continue;
    totalCents += e.cents;
    const l = per.get(e.customer);
    if (l) { l.cents += e.cents; l.count += 1; } else per.set(e.customer, { customer: e.customer, cents: e.cents, count: 1 });
  }
  return { byCustomer: [...per.values()].sort((a, b) => a.customer.localeCompare(b.customer)).sort((a, b) => b.cents - a.cents), totalCents };
}

/** The cancelled entries (a void row nobody amended after): they do not count, but they stay listed so a mistaken cancel can be undone later (independent review SHOULD 3). */
export function cancelled(rows: readonly MoneyEntry[]): MoneyEntry[] {
  const amended = new Set(rows.map((r) => r.amends).filter((x): x is string => typeof x === 'string'));
  return rows.filter((r) => r.void === true && !amended.has(r.id)).sort((a, b) => b.at.localeCompare(a.at));
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
/** A row read back from the phone (or a restored backup) must have the exact shape; anything else is left out instead of crashing the screen. */
export function isEntry(r: unknown): r is MoneyEntry {
  if (typeof r !== 'object' || r === null) return false;
  const e = r as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.day === 'string' && validDay(e.day) && (e.dir === 'in' || e.dir === 'out')
    && typeof e.category === 'string' && (categoriesOf(e.dir) as readonly string[]).includes(e.category)
    && typeof e.cents === 'number' && Number.isSafeInteger(e.cents) && e.cents > 0 && e.cents <= MAX_CENTS
    && typeof e.note === 'string' && typeof e.at === 'string' && (e.amends === undefined || typeof e.amends === 'string')
    && (e.customer === undefined || typeof e.customer === 'string') && (e.crates === undefined || (typeof e.crates === 'number' && Number.isSafeInteger(e.crates) && e.crates > 0 && e.crates <= MAX_CRATES && e.dir === 'in' && e.category === 'sale')) && (e.owed === undefined || (e.owed === true && e.dir === 'in' && e.category === 'sale' && typeof e.customer === 'string'));
}
export async function loadMoney(db: AppDB, farm: string): Promise<MoneyEntry[]> {
  const v = (await db.settings.get(key(farm)))?.value;
  return Array.isArray(v) ? v.filter(isEntry) : [];
}
/** Appends one row. There is deliberately no update or delete function. */
export async function appendMoney(db: AppDB, farm: string, entry: MoneyEntry): Promise<void> {
  await db.transaction('rw', db.settings, async () => {          // read + write in ONE transaction: two quick appends can never overwrite each other
    const rows = await loadMoney(db, farm);
    if (rows.some((r) => r.id === entry.id)) throw new Error('duplicate id');
    if (entry.amends !== undefined && !rows.some((r) => r.id === entry.amends)) throw new Error('amends a missing row');
    await putLocal(db, key(farm), [...rows, entry]);
  });
}
