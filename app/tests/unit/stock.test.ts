import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { sumSigned } from '../../src/stock/balance';
import { balanceOf, buildAdjustment, buildReceipt, effectiveLots, flagsOf, type ReceiptInput } from '../../src/stock/stock';
import { parseSoonDays, soonTextOf } from '../../src/settings/soon';
import { guardAppendOnly, put } from '../../src/repo';
import { AppDB, type Row } from '../../src/db/schema';
import { makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { TEST_FARM_ID } from '../helpers/factories';

const SIXTY = parseSoonDays(undefined); // the default setting
const now = '2026-11-20T10:00:00.000Z';
const receipt = (over: Partial<ReceiptInput> = {}): ReceiptInput => ({ productId: 'prod-1', batch: 'A123', expiry: '2028-03-31', qty: '4,5', photoId: undefined, ...over });
const asRow = (o: Record<string, unknown>): Row => ({ id: 'x', farm_id: TEST_FARM_ID, ...o });
const ids = { lot: 'lot-1', movement: 'mov-1' };
const mov = (direction: 'in' | 'out', qty: string, id = crypto.randomUUID()): Row => ({ id, farm_id: TEST_FARM_ID, lot_key: 'lot-1', product_id: 'prod-1', direction, qty_str: qty, reason: 'x', created_at: now });

describe('receiving stock', () => {
  it('a lot and its first movement; the quantity is kept exactly as typed', () => {
    const r = buildReceipt(receipt(), TEST_FARM_ID, now, ids);
    expect(r).toMatchObject({ ok: true, lot: { id: 'lot-1', lot_key: 'lot-1', product_id: 'prod-1', batch: 'A123', expiry: '2028-03-31' }, movement: { lot_key: 'lot-1', direction: 'in', qty_str: '4.5', reason: 'receipt' } });
    expect(buildReceipt(receipt({ qty: '0,250' }), TEST_FARM_ID, now, ids)).toMatchObject({ movement: { qty_str: '0.250' } });
  });
  it('refuses: no product, an expiry that is missing or not a real date (with year), a quantity that is missing, zero, negative or ambiguous', () => {
    expect(buildReceipt(receipt({ productId: '' }), TEST_FARM_ID, now, ids)).toMatchObject({ ok: false, product: true });
    for (const bad of ['', '31/03/2028', '2028-02-31', 'Invalid Date', '28-03-31']) expect(buildReceipt(receipt({ expiry: bad }), TEST_FARM_ID, now, ids), bad).toMatchObject({ ok: false, expiry: true });
    expect(buildReceipt(receipt({ qty: '' }), TEST_FARM_ID, now, ids)).toMatchObject({ ok: false, qty: 'missing' });
    for (const bad of ['0', '0,0', '-1', '1.000', 'abc', 'NaN']) expect(buildReceipt(receipt({ qty: bad }), TEST_FARM_ID, now, ids), bad).toMatchObject({ ok: false, qty: 'invalid' });
  });
  it('batch and photo are optional and stored only when given', () => {
    const r = buildReceipt(receipt({ batch: ' ' }), TEST_FARM_ID, now, ids);
    expect(r.ok && ('batch' in r.lot || 'photo_id' in r.lot)).toBe(false);
    expect(buildReceipt(receipt({ photoId: 'ph-1' }), TEST_FARM_ID, now, ids)).toMatchObject({ lot: { photo_id: 'ph-1' } });
  });
});

describe('adjusting a lot: direction chosen, quantity above zero, a reason, corrections point at the old row', () => {
  const base = { lotKey: 'lot-1', productId: 'prod-1', direction: 'out' as const, qty: '0,5', reason: 'spilled', amendsId: undefined };
  it('builds the movement', () => {
    expect(buildAdjustment(base, TEST_FARM_ID, now, 'm2')).toMatchObject({ ok: true, movement: { direction: 'out', qty_str: '0.5', reason: 'spilled', lot_key: 'lot-1' } });
    expect(buildAdjustment({ ...base, amendsId: 'mov-1' }, TEST_FARM_ID, now, 'm3')).toMatchObject({ ok: true, movement: { amends_id: 'mov-1' } });
  });
  it('refuses a missing direction, reason or quantity (nothing preselected, nothing guessed)', () => {
    expect(buildAdjustment({ ...base, direction: undefined }, TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, direction: true });
    expect(buildAdjustment({ ...base, reason: '  ' }, TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, reason: true });
    expect(buildAdjustment({ ...base, qty: '0' }, TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, qty: 'invalid' });
  });
});

describe('balance = sum of movements, exact; a negative balance is shown, never hidden', () => {
  it('in minus out without rounding', () => {
    expect(balanceOf([mov('in', '4.5'), mov('out', '0.25'), mov('in', '0.125')])).toBe('4.375');
    expect(balanceOf([mov('in', '1.50'), mov('out', '1.5')])).toBe('0');
    expect(balanceOf([])).toBe('0');
  });
  it('can go negative and says so', () => {
    expect(balanceOf([mov('in', '1'), mov('out', '1.5')])).toBe('-0.5');
    expect(flagsOf(asRow({ expiry: '2028-03-31' }), '-0.5', '2026-11-20', SIXTY)).toMatchObject({ negative: true });
  });
  it('an unreadable movement makes the balance unknown, never a quietly smaller number', () => {
    for (const bad of [{ qty_str: 'NaN' }, { qty_str: 5 }, { qty_str: undefined }, { direction: 'sideways' }]) expect(balanceOf([mov('in', '2'), { ...mov('in', '1'), ...bad }]), JSON.stringify(bad)).toBeUndefined();
    expect(flagsOf(asRow({ expiry: '2028-03-31' }), undefined, '2026-11-20', SIXTY)).toMatchObject({ unknown: true });
  });
  it('property: 2000 seeded ledgers match the integer sum and do not depend on the order', () => {
    let x = 4242;
    const next = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
    for (let i = 0; i < 2000; i += 1) {
      const rows = Array.from({ length: 1 + (next() % 8) }, () => ({ units: 1 + (next() % 99999), out: next() % 2 === 0 }));
      const expected = rows.reduce((a, r) => a + (r.out ? -r.units : r.units), 0); // units of 0.001
      const items = rows.map((r) => ({ qty: `${(r.units - (r.units % 1000)) / 1000}.${String(r.units % 1000).padStart(3, '0')}`, sign: (r.out ? -1 : 1) as 1 | -1 }));
      const got = sumSigned(items);
      const back = got.startsWith('-') ? -1 : 1;
      const [whole, frac = ''] = got.replace('-', '').split('.');
      expect(back * (parseFloat(whole) * 1000 + parseFloat(frac.padEnd(3, '0'))), got).toBe(expected);
      expect(sumSigned([...items].reverse())).toBe(got);
    }
  });
});

describe('flags: expired and soon are information; a date nobody can read counts as expired', () => {
  const today = '2026-11-20';
  const lot = (expiry: unknown) => asRow({ expiry });
  it('expired / soon / fine', () => {
    expect(flagsOf(lot('2026-11-19'), '1', today, SIXTY)).toMatchObject({ expired: true, soon: false });
    expect(flagsOf(lot('2026-11-20'), '1', today, SIXTY)).toMatchObject({ expired: false, soon: true }); // today is still in date
    expect(flagsOf(lot('2027-01-19'), '1', today, SIXTY)).toMatchObject({ expired: false, soon: true }); // exactly SOON_DAYS (60) away
    expect(SIXTY).toEqual({ known: true, value: 60 });
    expect(flagsOf(lot('2027-01-19'), '1', today, parseSoonDays('30'))).toMatchObject({ soon: false }); // Bora can change it
    expect(flagsOf(lot('2026-12-20'), '1', today, parseSoonDays('30'))).toMatchObject({ soon: true });
    expect(flagsOf(lot('2026-12-21'), '1', today, parseSoonDays('30'))).toMatchObject({ soon: false });
    expect(flagsOf(lot('2026-11-25'), '1', today, parseSoonDays('0'))).toMatchObject({ soon: false }); // an unusable setting gives no «soon» flag
    expect(flagsOf(lot('2027-01-20'), '1', today, SIXTY)).toMatchObject({ expired: false, soon: false });
  });
  it('an unreadable expiry or unreadable «today» is never «fine»', () => {
    for (const bad of [undefined, '', 'Invalid Date', '2028-02-31', 5]) expect(flagsOf(lot(bad), '1', today, SIXTY), String(bad)).toMatchObject({ expired: true });
    expect(flagsOf(lot('2030-01-01'), '1', 'Invalid Date', SIXTY)).toMatchObject({ expired: true });
  });
});

describe('lots are corrected by amending rows; the ledger never changes', () => {
  it('the newest row of a lot_key is in force', () => {
    const a = asRow({ id: 'l1', lot_key: 'l1', created_at: '2026-11-01', batch: 'A' });
    const b = asRow({ id: 'l2', lot_key: 'l1', created_at: '2026-11-02', batch: 'B', amends_id: 'l1' });
    expect(effectiveLots([a, b]).map((l) => l.batch)).toEqual(['B']);
  });
  it('stock tables are append-only: a direct change or delete throws, a ledger survives backup → restore once and only once', async () => {
    const a = new AppDB(`test-${crypto.randomUUID()}`); guardAppendOnly(a); await a.open();
    const r = buildReceipt(receipt(), TEST_FARM_ID, now, ids);
    if (!r.ok) throw new Error('setup');
    await put(a, 'stock_lots', r.lot, 'insert');
    await put(a, 'stock_movements', r.movement, 'insert');
    await expect(a.stock_movements.update('mov-1', { qty_str: '999' })).rejects.toThrow(/append-only/);
    await expect(a.stock_lots.delete('lot-1')).rejects.toThrow(/append-only/);
    await expect(put(a, 'stock_movements', { ...r.movement, qty_str: '999' }, 'update')).rejects.toThrow(/append-only/);

    const backup = parseBackup(JSON.stringify(await makeBackup(a, { id: TEST_FARM_ID, name: 'T' }, 'test')));
    const b = new AppDB(`test-${crypto.randomUUID()}`); guardAppendOnly(b); await b.open();
    await restoreBackup(b, backup, 'empty');
    await restoreBackup(b, backup, TEST_FARM_ID);
    expect(await b.stock_movements.count()).toBe(1);
    expect(balanceOf(await b.stock_movements.toArray())).toBe('4.5');
    expect((await b.outbox.toArray()).filter((o) => o.table === 'stock_movements')).toHaveLength(1);
  });
});

describe('the «expires soon» setting', () => {
  it('nothing stored = 60; 1–365 whole days are accepted; anything else is unusable, never guessed', () => {
    expect(parseSoonDays(undefined)).toEqual({ known: true, value: 60 });
    expect(parseSoonDays('45')).toEqual({ known: true, value: 45 });
    for (const bad of ['0', '366', '-5', '4,5', 'abc', '', 7, null]) expect(parseSoonDays(bad).known, String(bad)).toBe(false);
  });
  it('what the farmer types is stored only when it is a whole number from 1 to 365', () => {
    expect(soonTextOf(' 90 ')).toBe('90');
    for (const bad of ['', '0', '400', '1.5', 'x']) expect(soonTextOf(bad), bad).toBeUndefined();
  });
});
