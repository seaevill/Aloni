import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { appendMoney, buildEntry, isEntry, loadMoney, type MoneyEntry } from '../../src/money/ledger';
import { putLocal } from '../../src/repo';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

const NOW = '2026-11-25T10:00:00.000Z';
const input = (day: string) => ({ day, dir: 'out' as const, category: 'fuel', amount: '10', note: '' });
const good: MoneyEntry = { id: 'a', day: '2026-11-01', dir: 'out', category: 'fuel', cents: 1000, note: '', at: 't1' };

describe('Ταμείο hardening (independent review 2026-11-25)', () => {
  it('a day before 2000 or more than a year ahead is a typing error, today and next month are fine', () => {
    for (const bad of ['1999-12-31', '2062-01-01', '0000-01-01', '9999-12-31']) expect(buildEntry(input(bad), 'x', NOW)).toEqual({ ok: false, reason: 'day' });
    for (const ok of ['2026-11-25', '2026-12-20', '2000-01-01', '2027-11-26']) expect(buildEntry(input(ok), 'x', NOW).ok).toBe(true);
    expect(buildEntry(input('2027-11-27'), 'x', NOW)).toEqual({ ok: false, reason: 'day' });
  });
  it('rows with a wrong shape are left out when read back, they never crash the screen', async () => {
    const db = await newDb();
    await putLocal(db, `money:${F}`, [good, { id: 'b' }, null, 'x', { ...good, id: 'c', cents: 1.5 }, { ...good, id: 'd', day: 'tomorrow' }, { ...good, id: 'e', category: 'sale' }, { ...good, id: 'f', cents: 0 }]);
    expect((await loadMoney(db, F)).map((r) => r.id)).toEqual(['a']);
    expect(isEntry(good)).toBe(true);
  });
  it('two appends at the same moment both survive (one transaction each)', async () => {
    const db = await newDb();
    await Promise.all([appendMoney(db, F, { ...good, id: 'a' }), appendMoney(db, F, { ...good, id: 'b' }), appendMoney(db, F, { ...good, id: 'c' })]);
    expect((await loadMoney(db, F)).map((r) => r.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('cancelled entries stay visible and can be restored (review SHOULD 3)', () => {
  it('lists a void row nobody amended; once restored it is no longer listed and counts again', async () => {
    const { cancelled, effective, restoreOf, voidOf } = await import('../../src/money/ledger');
    const v = voidOf(good, 'v1', 't2');
    expect(cancelled([good, v]).map((r) => r.id)).toEqual(['v1']);
    expect(effective([good, v])).toEqual([]);
    const back = restoreOf(v, 'r1', 't3');
    expect(cancelled([good, v, back])).toEqual([]);
    expect(effective([good, v, back]).map((r) => [r.id, r.cents])).toEqual([['r1', 1000]]);
  });
});
