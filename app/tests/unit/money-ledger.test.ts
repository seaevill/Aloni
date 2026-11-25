import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { appendMoney, buildEntry, categoriesOf, effective, historyOf, loadMoney, parseCents, restoreOf, rootOf, voidOf, yearSummary, yearsOf, MAX_CENTS, type MoneyEntry } from '../../src/money/ledger';
import { formatMoney } from '../../src/i18n/format';
import { lang } from '../../src/i18n';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

const row = (id: string, day: string, dir: 'in' | 'out', cents: number, at: string, extra: Partial<MoneyEntry> = {}): MoneyEntry =>
  ({ id, day, dir, category: dir === 'in' ? 'sale' : 'fuel', cents, note: '', at, ...extra });

describe('parseCents: euro text → whole cents, never guessed', () => {
  it('reads the Greek comma and the dot, keeps every cent', () => {
    expect(parseCents('45,50')).toEqual({ known: true, value: 4550 });
    expect(parseCents('45.5')).toEqual({ known: true, value: 4550 });
    expect(parseCents('1200')).toEqual({ known: true, value: 120000 });
    expect(parseCents('0,05')).toEqual({ known: true, value: 5 });
    expect(parseCents(' 7 ')).toEqual({ known: true, value: 700 });
    expect(parseCents('999999,99')).toEqual({ known: true, value: MAX_CENTS });
  });
  it('refuses what could be read two ways, more than 2 decimals, zero, signs, text and too big', () => {
    for (const bad of ['1.000', '1,000', '0,125', '12,505', '0', '0,00', '-5', '+5', '1e3', 'abc', '1 000', '1000000', '45,5€']) expect(parseCents(bad).known).toBe(false);
    expect(parseCents('')).toEqual({ known: false, reason: 'missing' });
  });
});

describe('formatMoney: cents → text, nothing rounded', () => {
  it('prints two decimals with the language separator and a real minus', () => {
    lang.value = 'el';
    expect(formatMoney(4550)).toBe('45,50 €');
    expect(formatMoney(5)).toBe('0,05 €');
    expect(formatMoney(0)).toBe('0,00 €');
    expect(formatMoney(-120000)).toBe('−1200,00 €');
    lang.value = 'en';
    expect(formatMoney(4550)).toBe('45.50 €');
    lang.value = 'el';
  });
  it('a non-integer or unsafe value is unknown, never a made-up amount', () => {
    for (const bad of [45.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60]) expect(formatMoney(bad)).toBe('— άγνωστο');
  });
});

describe('buildEntry', () => {
  it('builds a full row from valid input', () => {
    expect(buildEntry({ day: '2026-11-23', dir: 'out', category: 'fuel', amount: '45,50', note: ' diesel ' }, 'e1', '2026-11-23T08:00:00Z')).toEqual({
      ok: true, entry: { id: 'e1', day: '2026-11-23', dir: 'out', category: 'fuel', cents: 4550, note: 'diesel', at: '2026-11-23T08:00:00Z' },
    });
    expect(buildEntry({ day: '2026-11-23', dir: 'in', category: 'sale', amount: '120', crop: 'spinach', note: '' }, 'e2', 'T', 'e0')).toEqual({
      ok: true, entry: { id: 'e2', day: '2026-11-23', dir: 'in', category: 'sale', cents: 12000, note: '', crop: 'spinach', amends: 'e0', at: 'T' },
    });
  });
  it('refuses a bad amount, a day that does not exist and a category of the other direction', () => {
    expect(buildEntry({ day: '2026-11-23', dir: 'out', category: 'fuel', amount: '1.000', note: '' }, 'x', 'T')).toEqual({ ok: false, reason: 'amount' });
    expect(buildEntry({ day: '2026-02-30', dir: 'out', category: 'fuel', amount: '5', note: '' }, 'x', 'T')).toEqual({ ok: false, reason: 'day' });
    expect(buildEntry({ day: '2026-11-23', dir: 'in', category: 'fuel', amount: '5', note: '' }, 'x', 'T')).toEqual({ ok: false, reason: 'category' });
    expect(categoriesOf('in')).not.toContain('fuel');
  });
});

describe('append-only chain: correct and cancel', () => {
  const a = row('a', '2026-11-01', 'out', 4550, '2026-11-01T10:00:00Z');
  const a2 = row('a2', '2026-11-01', 'out', 4000, '2026-11-02T10:00:00Z', { amends: 'a' });
  const b = row('b', '2026-11-05', 'in', 12000, '2026-11-05T10:00:00Z');
  it('a correction replaces the original; the history keeps both', () => {
    expect(effective([a, a2, b]).map((e) => [e.id, e.cents])).toEqual([['b', 12000], ['a2', 4000]]);
    expect(historyOf([a, a2, b], 'a').map((e) => e.id)).toEqual(['a', 'a2']);
    expect(rootOf([a, a2, b], a2)).toBe('a');
  });
  it('a cancel removes the row from the totals; undo is one more amending row', () => {
    const v = voidOf(a2, 'v', '2026-11-03T10:00:00Z');
    expect(v).toEqual({ id: 'v', day: '2026-11-01', dir: 'out', category: 'fuel', cents: 4000, note: '', amends: 'a2', void: true, at: '2026-11-03T10:00:00Z' });
    expect(effective([a, a2, v, b]).map((e) => e.id)).toEqual(['b']);
    const back = restoreOf(v, 'u', '2026-11-03T10:00:05Z');
    expect(back).toEqual({ id: 'u', day: '2026-11-01', dir: 'out', category: 'fuel', cents: 4000, note: '', amends: 'v', at: '2026-11-03T10:00:05Z' });
    expect(effective([a, a2, v, back, b]).map((e) => e.id)).toEqual(['b', 'u']);
  });
  it('two amendments of the same row: the newest wins', () => {
    const late = row('z', '2026-11-01', 'out', 3000, '2026-11-04T10:00:00Z', { amends: 'a' });
    expect(effective([a, a2, late]).map((e) => e.cents)).toEqual([3000]);
  });
});

describe('yearSummary', () => {
  it('sums whole cents per year, month and category; other years and cancelled rows do not count', () => {
    const rows = [
      row('1', '2026-01-15', 'in', 10000, 't1'), row('2', '2026-01-20', 'out', 2550, 't2'), row('3', '2026-11-02', 'out', 101, 't3', { category: 'seed' }),
      row('4', '2025-12-31', 'in', 99999, 't4'), row('5', '2026-03-01', 'in', 500, 't5'), voidOf(row('5', '2026-03-01', 'in', 500, 't5'), '6', 't6'),
    ];
    const s = yearSummary(rows, '2026');
    expect([s.inCents, s.outCents, s.netCents]).toEqual([10000, 2651, 7349]);
    expect(s.months[0]).toEqual({ inCents: 10000, outCents: 2550, netCents: 7450 });
    expect(s.months[2]).toEqual({ inCents: 0, outCents: 0, netCents: 0 });
    expect(s.months[10]).toEqual({ inCents: 0, outCents: 101, netCents: -101 });
    expect(s.byCategory).toEqual([{ dir: 'in', category: 'sale', cents: 10000 }, { dir: 'out', category: 'fuel', cents: 2550 }, { dir: 'out', category: 'seed', cents: 101 }]);
    expect(yearsOf(rows, '2026')).toEqual(['2026', '2025']);
    expect(yearsOf([], '2027')).toEqual(['2027']);
  });
});

describe('storage on this phone, per farm', () => {
  it('appends only; refuses a duplicate id and an amendment of a missing row', async () => {
    const db = await newDb();
    expect(await loadMoney(db, F)).toEqual([]);
    const e = row('a', '2026-11-01', 'out', 4550, 't1');
    await appendMoney(db, F, e);
    expect(await loadMoney(db, F)).toEqual([e]);
    expect(await loadMoney(db, 'other-farm')).toEqual([]);
    await expect(appendMoney(db, F, e)).rejects.toThrow('duplicate id');
    await expect(appendMoney(db, F, row('b', '2026-11-01', 'out', 1, 't2', { amends: 'nope' }))).rejects.toThrow('amends a missing row');
    expect(await db.outbox.count()).toBe(0);         // never queued for sync in F1
  });
});
