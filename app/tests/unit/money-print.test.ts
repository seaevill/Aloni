import { describe, expect, it } from 'vitest';
import { moneyPrintData, printDay, printEuros } from '../../src/money/print';
import { voidOf, type MoneyEntry } from '../../src/money/ledger';

const row = (id: string, day: string, dir: 'in' | 'out', cents: number, at: string, extra: Partial<MoneyEntry> = {}): MoneyEntry =>
  ({ id, day, dir, category: dir === 'in' ? 'sale' : 'fuel', cents, note: '', at, ...extra });
const fmt = { dir: (d: string) => `dir:${d}`, category: (c: string) => `cat:${c}`, crop: (s: string | undefined) => (s === undefined ? '' : `crop:${s}`) };

describe('printEuros / printDay: Greek print formats, whole-number arithmetic, nothing rounded', () => {
  it('keeps every cent with a decimal comma and puts a minus on a loss', () => {
    expect(printEuros(4550)).toBe('45,50');
    expect(printEuros(5)).toBe('0,05');
    expect(printEuros(120000)).toBe('1200,00');
    expect(printEuros(-4550)).toBe('−45,50');
    expect(printEuros(-5)).toBe('−0,05');
    expect(printEuros(0)).toBe('0,00');
  });
  it('writes the day in the Greek order whatever the screen language is', () => {
    expect(printDay('2026-11-16')).toBe('16/11/2026');
    expect(printDay('2026-01-05')).toBe('05/01/2026');
  });
  it('escape attempt: a value that is not a whole number of cents prints «unknown», never a made-up amount', () => {
    expect(printEuros(12.5, 'unknown')).toBe('unknown');
    expect(printEuros(Number.NaN, 'unknown')).toBe('unknown');
    expect(printDay('not-a-day', 'unknown')).toBe('unknown');
  });
});

describe('moneyPrintData: the counted rows of one year, the same rows as the CSV', () => {
  it('lists a corrected row once, drops a cancelled row and other years, and totals match the lines', () => {
    const a = row('a', '2026-03-02', 'out', 4550, '2026-03-02T08:00:00Z');
    const fix = row('a2', '2026-03-02', 'out', 4000, '2026-03-03T08:00:00Z', { amends: 'a' });
    const b = row('b', '2026-01-10', 'in', 120000, '2026-01-10T08:00:00Z', { crop: 'spinach' });
    const old = row('c', '2025-12-31', 'in', 100, '2025-12-31T08:00:00Z');
    const gone = row('d', '2026-02-01', 'out', 900, '2026-02-01T08:00:00Z');
    const data = moneyPrintData([a, fix, b, old, gone, voidOf(gone, 'v1', '2026-02-02T08:00:00Z')], '2026', fmt, 'unknown');
    expect(data.lines.map((l) => [l.day, l.dir, l.amount])).toEqual([['10/01/2026', 'dir:in', '1200,00'], ['02/03/2026', 'dir:out', '40,00']]);
    expect(data).toMatchObject({ inTotal: '1200,00', outTotal: '40,00', netTotal: '1160,00' });
  });
  it('a year with a loss shows a negative net', () => {
    const data = moneyPrintData([row('a', '2026-03-02', 'out', 700, '2026-03-02T08:00:00Z'), row('b', '2026-03-03', 'in', 200, '2026-03-03T08:00:00Z')], '2026', fmt, 'unknown');
    expect(data.netTotal).toBe('−5,00');
  });
  it('escape attempt: a formula-looking note is printed as plain text, unchanged (no quote is added to a printed page)', () => {
    const evil = row('a', '2026-03-02', 'out', 100, '2026-03-02T08:00:00Z', { note: '=SUM(1)' });
    expect(moneyPrintData([evil], '2026', fmt, 'unknown').lines[0].note).toBe('=SUM(1)');
  });
});
