import { moneyLines, type MoneyFmt, type MoneyLine } from './export';
import { yearSummary } from './ledger';

// «Ταμείο» → the printed page for the accountant (F3, PDF part). Same counted rows as the CSV (one year, corrected rows once, cancelled rows not at all);
// the page is always Greek and the amounts keep every cent. Nothing here is signed, summed beyond the three year totals, or tax-computed.

/** 4550 → «45,50», −5 → «−0,05»: whole-number string work only, no rounding. A value that is not a whole number of cents prints `unknown`. */
export function printEuros(cents: number, unknown = ''): string {
  if (!Number.isSafeInteger(cents)) return unknown;
  const digits = String(cents < 0 ? -cents : cents).padStart(3, '0');
  return `${cents < 0 ? '−' : ''}${digits.slice(0, -2)},${digits.slice(-2)}`;
}

/** «2026-11-16» → «16/11/2026» (Greek order, whatever the screen language is). Anything else prints `unknown`. */
export function printDay(day: string, unknown = ''): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : unknown;
}

export interface MoneyPrintData { lines: MoneyLine[]; inTotal: string; outTotal: string; netTotal: string }

export function moneyPrintData(rows: Parameters<typeof moneyLines>[0], year: string, f: MoneyFmt, unknown: string): MoneyPrintData {
  const s = yearSummary(rows, year);
  return {
    lines: moneyLines(rows, year, f).map((l) => ({ ...l, day: printDay(l.day, unknown) })),
    inTotal: printEuros(s.inCents, unknown), outTotal: printEuros(s.outCents, unknown), netTotal: printEuros(s.netCents, unknown),
  };
}
