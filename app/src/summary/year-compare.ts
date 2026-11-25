import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// «Φέτος – πέρυσι»: the whole crates harvested per Athens calendar month this year and last year, from the grower's OWN harvest records of one crop. Last year is also summed up to the same
// calendar day, so the comparison is like with like. An unreadable crate number is counted apart (never 0); no records last year = no comparison. Information only.
export interface YearSide { months: number[]; total: number; unreadable: number; /** crates up to the same calendar day (month and day) of the other year's «today» */ samePeriod: number }
export interface YearCompare { thisYear: YearSide; lastYear: YearSide; hasLast: boolean; /** one entry per month (0 = January): the two years side by side, for drawing */ rows: Array<{ month: number; thisYear: number; lastYear: number }> }
const rowsOf = (a: YearSide, b: YearSide): YearCompare['rows'] => a.months.map((n, month) => ({ month, thisYear: n, lastYear: b.months.slice(month, month + 1).reduce((sum, v) => sum + v, 0) }));
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const dayOf = (iso: string): string => { const ms = Date.parse(iso); return Number.isFinite(ms) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms) : ''; };
const empty = (): YearSide => ({ months: Array.from({ length: 12 }, () => 0), total: 0, unreadable: 0, samePeriod: 0 });

export function yearCompare(cropId: string, plantings: readonly Row[], harvests: readonly Row[], today: string): YearCompare {
  const mine = new Set(plantings.filter((p) => p.crop_id === cropId && !p.deleted_at).map((p) => text(p.id)));
  const t = DAY.exec(today);
  const thisYearNo = parseWhole<'Year'>(t?.[1] ?? '');
  if (!t || !thisYearNo.known) { const e = empty(); return { thisYear: e, lastYear: empty(), hasLast: false, rows: rowsOf(e, empty()) }; }
  const year = t[1] as string; const lastNo = thisYearNo.value - 1; const last = `${lastNo}`; const md = `${t[2]}-${t[3]}`;
  const sides = new Map<string, YearSide>([[year, empty()], [last, empty()]]);
  let lastRecords = 0;
  for (const h of harvests) {
    if (h.deleted_at || !mine.has(text(h.planting_id))) continue;
    const d = DAY.exec(dayOf(text(h.harvested_at)));
    const side = d ? sides.get(d[1] as string) : undefined;
    if (!d || !side) continue;
    if (d[1] === last) lastRecords += 1;
    const n = parseWhole<'Crates'>(text(h.crates_str)); const month = parseWhole<'Month'>(d[2] as string);
    if (!n.known) { side.unreadable += 1; continue; }
    if (!month.known) continue;
    const cur = side.months[month.value - 1];
    if (cur === undefined) continue;
    side.months[month.value - 1] = cur + n.value; side.total += n.value;
    if (`${d[2]}-${d[3]}` <= md) side.samePeriod += n.value;
  }
  const a = sides.get(year) as YearSide; const b = sides.get(last) as YearSide;
  return { thisYear: a, lastYear: b, hasLast: lastRecords > 0, rows: rowsOf(a, b) };
}
