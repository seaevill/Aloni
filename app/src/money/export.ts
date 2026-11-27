import { effective, type MoneyEntry } from './ledger';

// «Ταμείο» → CSV for the accountant (F3, first part). The file lists the counted rows of ONE year exactly as stored: a corrected entry once with its
// newest amount, a cancelled one not at all. Amounts keep every cent (decimal comma), nothing is summed or rounded here and no tax is computed.
// Same file rules as the spray register CSV: semicolon, UTF-8 BOM, CRLF, and a cell that could run as a spreadsheet formula gets a leading quote.

export const MONEY_COLUMNS = ['day', 'dir', 'category', 'crop', 'amount', 'note', 'record'] as const;
export type MoneyColumn = (typeof MONEY_COLUMNS)[number];
export type MoneyLine = Record<MoneyColumn, string>;
export interface MoneyFmt { dir: (d: 'in' | 'out') => string; category: (c: string) => string; crop: (slug: string | undefined) => string }

/** 4550 → «45,50»: integer arithmetic only. */
const euros = (cents: number): string => `${String((cents - (cents % 100)) / 100)},${String(cents % 100).padStart(2, '0')}`;

export function moneyLines(rows: readonly MoneyEntry[], year: string, f: MoneyFmt): MoneyLine[] {
  return effective(rows)
    .filter((e) => e.day.startsWith(`${year}-`))
    .sort((a, b) => a.at.localeCompare(b.at)).sort((a, b) => a.day.localeCompare(b.day))
    .map((e) => ({ day: e.day, dir: f.dir(e.dir), category: f.category(e.category), crop: f.crop(e.crop), amount: euros(e.cents), note: e.note, record: e.id }));
}

const cell = (v: string): string => (/[";\n\r]/.test(v) ? `"${v.split('"').join('""')}"` : v);
const safe = (v: string): string => (/^[=+@\t]/.test(v) || (v.startsWith('-') && !/^-?\d/.test(v)) ? `'${v}` : v);
export function moneyCsv(draft: string, head: readonly string[], lines: readonly MoneyLine[]): string {
  return `﻿${[[draft], head, ...lines.map((l) => MONEY_COLUMNS.map((c) => l[c]))].map((r) => r.map((v) => cell(safe(v))).join(';')).join('\r\n')}\r\n`;
}
