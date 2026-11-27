import { describe, expect, it } from 'vitest';
import { moneyCsv, moneyLines, MONEY_COLUMNS } from '../../src/money/export';
import { voidOf, type MoneyEntry } from '../../src/money/ledger';

const row = (id: string, day: string, dir: 'in' | 'out', cents: number, at: string, extra: Partial<MoneyEntry> = {}): MoneyEntry =>
  ({ id, day, dir, category: dir === 'in' ? 'sale' : 'fuel', cents, note: '', at, ...extra });
const fmt = { dir: (d: string) => `dir:${d}`, category: (c: string) => `cat:${c}`, crop: (s: string | undefined) => (s === undefined ? '' : `crop:${s}`) };

describe('moneyLines: the ledger of one year as accountant lines', () => {
  it('lists only counted rows of that year, oldest day first; amounts keep every cent with a decimal comma', () => {
    const a = row('a', '2026-03-02', 'out', 4550, '2026-03-02T08:00:00Z');
    const b = row('b', '2026-01-10', 'in', 120000, '2026-01-10T08:00:00Z', { crop: 'spinach' });
    const old = row('c', '2025-12-31', 'in', 100, '2025-12-31T08:00:00Z');
    const gone = row('d', '2026-02-01', 'out', 900, '2026-02-01T08:00:00Z');
    const lines = moneyLines([a, b, old, gone, voidOf(gone, 'v1', '2026-02-02T08:00:00Z')], '2026', fmt);
    expect(lines.map((l) => l.record)).toEqual(['b', 'a']);
    expect(lines[0]).toMatchObject({ day: '2026-01-10', dir: 'dir:in', category: 'cat:sale', crop: 'crop:spinach', amount: '1200,00' });
    expect(lines[1]).toMatchObject({ dir: 'dir:out', amount: '45,50' });
  });
  it('a corrected entry is listed once, with the corrected amount', () => {
    const a = row('a', '2026-03-02', 'out', 4550, '2026-03-02T08:00:00Z');
    const fix = row('a2', '2026-03-02', 'out', 4000, '2026-03-03T08:00:00Z', { amends: 'a' });
    const lines = moneyLines([a, fix], '2026', fmt);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe('40,00');
  });
});

describe('moneyCsv', () => {
  it('has the draft line, a header, BOM, semicolons and CRLF', () => {
    const csv = moneyCsv('DRAFT', MONEY_COLUMNS.map((c) => c), moneyLines([row('a', '2026-01-10', 'in', 5, '2026-01-10T08:00:00Z')], '2026', fmt));
    expect(csv.startsWith('﻿DRAFT\r\n')).toBe(true);
    expect(csv.split('\r\n')[1]).toBe(MONEY_COLUMNS.join(';'));
    expect(csv.split('\r\n')[2]).toBe('2026-01-10;dir:in;cat:sale;;0,05;;a');
  });
  it('escape attempt: a note that starts like a formula, or holds ; " and a newline, cannot run or break out of its cell', () => {
    const evil = row('a', '2026-01-10', 'out', 100, '2026-01-10T08:00:00Z', { note: '=HYPERLINK("x";"y")' });
    const odd = row('b', '2026-01-11', 'out', 100, '2026-01-11T08:00:00Z', { note: 'a;b "q"\nnext' });
    const at = row('c', '2026-01-12', 'out', 100, '2026-01-12T08:00:00Z', { note: '@SUM(1)' });
    const csv = moneyCsv('D', [...MONEY_COLUMNS], moneyLines([evil, odd, at], '2026', fmt));
    expect(csv).toContain(`"'=HYPERLINK(""x"";""y"")"`);
    expect(csv).toContain(`"a;b ""q""\nnext"`);
    expect(csv).toContain(`'@SUM(1)`);
    expect(csv).not.toMatch(/;=HYPERLINK/);
  });
});
