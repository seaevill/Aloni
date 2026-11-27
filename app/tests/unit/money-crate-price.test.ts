import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildEntry, cratesTimesPrice, isEntry, lastCratePrice, restoreOf, settleOf, voidOf, type MoneyEntry } from '../../src/money/ledger';

const NOW = '2026-11-27T10:00:00Z';
const sale = (id: string, cents: number, crates: number | undefined, customer: string | undefined, crop: string | undefined, day: string, extra: Partial<MoneyEntry> = {}): MoneyEntry =>
  ({ id, day, dir: 'in', category: 'sale', cents, note: '', at: `${day}T08:00:00Z`, ...(crates !== undefined ? { crates } : {}), ...(customer !== undefined ? { customer } : {}), ...(crop !== undefined ? { crop } : {}), ...extra });

describe('crate count on a sale', () => {
  it('buildEntry keeps whole crates on a sale', () => {
    const r = buildEntry({ day: '2026-11-20', dir: 'in', category: 'sale', amount: '60', note: '', crates: '10' }, 'a', NOW);
    expect(r.ok && r.entry.crates).toBe(10);
  });
  it('escape attempts: 0, negative, fractions, text and huge counts are refused, never guessed', () => {
    const base = { day: '2026-11-20', dir: 'in' as const, category: 'sale', amount: '60', note: '' };
    for (const bad of ['0', '-3', '2,5', '2.5', 'abc', '1e3', '10000', '+4']) expect(buildEntry({ ...base, crates: bad }, 'a', NOW)).toEqual({ ok: false, reason: 'crates' });
  });
  it('an empty count means «not given»; a count on an expense or a non-sale income is dropped, never stored', () => {
    const base = { day: '2026-11-20', amount: '60', note: '' };
    const none = buildEntry({ ...base, dir: 'in', category: 'sale', crates: '' }, 'a', NOW);
    expect(none.ok && none.entry.crates).toBeUndefined();
    const fuel = buildEntry({ ...base, dir: 'out', category: 'fuel', crates: '4' }, 'a', NOW);
    expect(fuel.ok && fuel.entry.crates).toBeUndefined();
    const subsidy = buildEntry({ ...base, dir: 'in', category: 'subsidy', crates: '4' }, 'a', NOW);
    expect(subsidy.ok && subsidy.entry.crates).toBeUndefined();
  });
  it('void, restore and settle rows keep the crates', () => {
    const s = sale('1', 6000, 10, 'c1', 'lettuce', '2026-11-20', { owed: true });
    expect(voidOf(s, 'v', NOW).crates).toBe(10);
    expect(restoreOf(voidOf(s, 'v', NOW), 'r', NOW).crates).toBe(10);
    expect(settleOf(s, 'p', NOW).crates).toBe(10);
  });
  it('isEntry refuses a bad count and a count outside a sale', () => {
    expect(isEntry(sale('1', 6000, 10, 'c1', 'lettuce', '2026-11-20'))).toBe(true);
    expect(isEntry(sale('1', 6000, 0, undefined, undefined, '2026-11-20'))).toBe(false);
    expect(isEntry(sale('1', 6000, 2.5, undefined, undefined, '2026-11-20'))).toBe(false);
    expect(isEntry({ ...sale('1', 6000, 10, undefined, undefined, '2026-11-20'), dir: 'out', category: 'fuel' })).toBe(false);
  });
});

describe('lastCratePrice: the newest price per crate of this customer and crop', () => {
  it('takes the newest counted sale of that customer and crop (price per crate in cents)', () => {
    const rows = [sale('1', 5000, 10, 'c1', 'lettuce', '2026-11-10'), sale('2', 5500, 10, 'c1', 'lettuce', '2026-11-20'), sale('3', 9000, 10, 'c2', 'lettuce', '2026-11-25'), sale('4', 9000, 10, 'c1', 'dill', '2026-11-26')];
    expect(lastCratePrice(rows, 'c1', 'lettuce')).toEqual({ cents: 550, day: '2026-11-20' });
  });
  it('a corrected sale counts with its new amount; a cancelled sale does not count', () => {
    const rows = [sale('1', 5000, 10, 'c1', 'lettuce', '2026-11-10'), sale('2', 5500, 10, 'c1', 'lettuce', '2026-11-20')];
    const fixed = [...rows, sale('3', 6000, 10, 'c1', 'lettuce', '2026-11-20', { amends: '2', at: '2026-11-21T08:00:00Z' })];
    expect(lastCratePrice(fixed, 'c1', 'lettuce')?.cents).toBe(600);
    const gone = [...rows, voidOf(rows[1], 'v', '2026-11-22T08:00:00Z')];
    expect(lastCratePrice(gone, 'c1', 'lettuce')).toEqual({ cents: 500, day: '2026-11-10' });
  });
  it('never rounds: a sale whose total does not split into whole cents per crate gives no price, and the next older one is used', () => {
    const rows = [sale('1', 5000, 10, 'c1', 'lettuce', '2026-11-10'), sale('2', 1000, 3, 'c1', 'lettuce', '2026-11-20')];
    expect(lastCratePrice(rows, 'c1', 'lettuce')).toEqual({ cents: 500, day: '2026-11-10' });
    expect(lastCratePrice([rows[1]], 'c1', 'lettuce')).toBeUndefined();
  });
  it('unknown stays unknown: no crates, no customer, no crop, expenses, or nothing at all give no price', () => {
    expect(lastCratePrice([], 'c1', 'lettuce')).toBeUndefined();
    expect(lastCratePrice([sale('1', 5000, undefined, 'c1', 'lettuce', '2026-11-10')], 'c1', 'lettuce')).toBeUndefined();
    expect(lastCratePrice([sale('1', 5000, 10, undefined, 'lettuce', '2026-11-10')], 'c1', 'lettuce')).toBeUndefined();
    expect(lastCratePrice([sale('1', 5000, 10, 'c1', undefined, '2026-11-10')], 'c1', 'lettuce')).toBeUndefined();
    expect(lastCratePrice([sale('1', 5000, 10, 'c1', 'lettuce', '2026-11-10')], '', 'lettuce')).toBeUndefined();
  });
});

describe('cratesTimesPrice: the amount a suggestion would fill in', () => {
  it('multiplies whole numbers exactly', () => { expect(cratesTimesPrice(550, 12)).toBe(6600); });
  it('a result over the book limit or a bad count gives nothing', () => {
    expect(cratesTimesPrice(550, 0)).toBeUndefined();
    expect(cratesTimesPrice(550, 1.5)).toBeUndefined();
    expect(cratesTimesPrice(99_999_999, 2)).toBeUndefined();
  });
});
