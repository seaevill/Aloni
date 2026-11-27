import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { appendMoney, buildEntry, effective, isEntry, loadMoney, owedByCustomer, restoreOf, settleOf, voidOf, yearSummary, type MoneyEntry } from '../../src/money/ledger';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

const NOW = '2026-11-27T10:00:00Z';
const sale = (id: string, cents: number, customer: string | undefined, owed: boolean, at = NOW, day = '2026-11-20'): MoneyEntry =>
  ({ id, day, dir: 'in', category: 'sale', cents, note: '', at, ...(customer !== undefined ? { customer } : {}), ...(owed ? { owed: true as const } : {}) });

describe('veresiye: a sale can be marked as not paid yet', () => {
  it('buildEntry keeps the customer and the owed flag on a sale', () => {
    const r = buildEntry({ day: '2026-11-20', dir: 'in', category: 'sale', amount: '120,50', note: '', customer: 'c1', owed: true }, 'a', NOW);
    expect(r).toEqual({ ok: true, entry: { id: 'a', day: '2026-11-20', dir: 'in', category: 'sale', cents: 12050, note: '', at: NOW, customer: 'c1', owed: true } });
  });
  it('escape attempts: owed without a customer, owed on an expense or on a non-sale income is refused', () => {
    const base = { day: '2026-11-20', amount: '10', note: '' };
    expect(buildEntry({ ...base, dir: 'in', category: 'sale', owed: true }, 'a', NOW)).toEqual({ ok: false, reason: 'customer' });
    expect(buildEntry({ ...base, dir: 'in', category: 'sale', owed: true, customer: '' }, 'a', NOW)).toEqual({ ok: false, reason: 'customer' });
    expect(buildEntry({ ...base, dir: 'out', category: 'fuel', owed: true, customer: 'c1' }, 'a', NOW)).toEqual({ ok: false, reason: 'customer' });
    expect(buildEntry({ ...base, dir: 'in', category: 'subsidy', owed: true, customer: 'c1' }, 'a', NOW)).toEqual({ ok: false, reason: 'customer' });
  });
  it('a customer on an expense is dropped, never stored', () => {
    const r = buildEntry({ day: '2026-11-20', dir: 'out', category: 'fuel', amount: '10', note: '', customer: 'c1' }, 'a', NOW);
    expect(r.ok && r.entry.customer).toBeUndefined();
  });
});

describe('owedByCustomer: integer sums of the counted, unpaid sales', () => {
  it('groups by customer, biggest first, and adds a total', () => {
    const rows = [sale('1', 1050, 'c1', true), sale('2', 2000, 'c2', true), sale('3', 500, 'c1', true), sale('4', 9999, 'c1', false), sale('5', 700, undefined, false)];
    const o = owedByCustomer(rows);
    expect(o.byCustomer).toEqual([{ customer: 'c2', cents: 2000, count: 1 }, { customer: 'c1', cents: 1550, count: 2 }]);
    expect(o.totalCents).toBe(3550);
  });
  it('paying writes an amending row: nothing is removed, the sale is not counted twice, the year total is unchanged', () => {
    const a = sale('1', 4000, 'c1', true);
    const paid = settleOf(a, 'p1', '2026-11-28T08:00:00Z');
    expect(paid).toEqual({ id: 'p1', day: a.day, dir: 'in', category: 'sale', cents: 4000, note: '', amends: '1', at: '2026-11-28T08:00:00Z', customer: 'c1' });
    expect(owedByCustomer([a, paid])).toEqual({ byCustomer: [], totalCents: 0 });
    expect(effective([a, paid])).toHaveLength(1);
    expect(yearSummary([a, paid], '2026').inCents).toBe(4000);
    expect(yearSummary([a], '2026').inCents).toBe(4000);
  });
  it('a cancelled owed sale is not owed; restoring it makes it owed again', () => {
    const a = sale('1', 4000, 'c1', true);
    const v = voidOf(a, 'v1', '2026-11-28T08:00:00Z');
    expect(owedByCustomer([a, v]).totalCents).toBe(0);
    const back = restoreOf(v, 'r1', '2026-11-28T09:00:00Z');
    expect(back.owed).toBe(true);
    expect(back.customer).toBe('c1');
    expect(owedByCustomer([a, v, back]).totalCents).toBe(4000);
  });
  it('a correction of the amount keeps the debt and counts the new amount', () => {
    const a = sale('1', 4000, 'c1', true);
    const fix = { ...sale('2', 4500, 'c1', true, '2026-11-28T08:00:00Z'), amends: '1' };
    expect(owedByCustomer([a, fix]).totalCents).toBe(4500);
  });
});

describe('storage: the new fields survive a phone round trip and bad shapes are left out', () => {
  it('isEntry accepts customer/owed and refuses wrong types', () => {
    expect(isEntry(sale('1', 100, 'c1', true))).toBe(true);
    expect(isEntry({ ...sale('1', 100, 'c1', true), owed: false })).toBe(false);
    expect(isEntry({ ...sale('1', 100, 'c1', true), customer: 5 })).toBe(false);
    expect(isEntry({ ...sale('1', 100, undefined, true) })).toBe(false);          // owed without a customer
    expect(isEntry({ ...sale('1', 100, 'c1', false), dir: 'out', category: 'fuel', owed: true })).toBe(false);
  });
  it('append + load keeps them', async () => {
    const db = await newDb();
    await appendMoney(db, F, sale('1', 100, 'c1', true));
    expect((await loadMoney(db, F))[0]).toMatchObject({ customer: 'c1', owed: true });
  });
});
