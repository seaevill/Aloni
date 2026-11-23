import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { serverRecordsOf } from '../../src/owner-records/mode';
import { moveLocalOwnerRecords } from '../../src/owner-records/migrate';
import { loadOrders, mapKey, ordersKey } from '../../src/orders/store';
import { addCustomerOrder } from '../../src/orders/customers';
import { putLocal } from '../../src/repo';
import { READINESS_KEY } from '../../src/settings/readiness';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const EMPTY = { products: [], weeks: {}, skipped: 0, days: {}, clients: [] };
async function localFarm() {
  const db = await newDb();
  await db.crops.put({ id: 'crop-1', farm_id: F, slug: 'parsley', name: 'Μαϊντανός' });
  await db.workers.put({ id: 'w1', farm_id: F, name: 'Γιώργος' });
  await putLocal(db, `customers:${F}`, [{ id: 'cu1', name: 'Μαρία', phone: '69', note: '' }]);
  const added = addCustomerOrder(EMPTY, {}, { customerId: 'cu1', customerName: 'Μαρία', slug: 'parsley', cropName: 'Μαϊντανός', day: '2026-11-23', crates: '12' });
  if (!added.ok) throw new Error('setup');
  await putLocal(db, ordersKey(F), added.orders); await putLocal(db, mapKey(F), added.map);
  await putLocal(db, `worker_card:${F}:w1`, { surname: 'Π', phone: '70' });
  return db;
}

describe('server mode of the owner-only records (only after the owner confirmed ≥ 0037)', () => {
  it('the flag is a plain read of what the owner confirmed', () => {
    expect(serverRecordsOf(undefined)).toBe(false);
    expect(serverRecordsOf({ migration: '0034' })).toBe(false);
    expect(serverRecordsOf({ migration: '0036' })).toBe(false);
    expect(serverRecordsOf({ migration: '0037' })).toBe(true);
    expect(serverRecordsOf({ migration: '0041' })).toBe(true);
    expect(serverRecordsOf({ migration: 'x' })).toBe(false);
  });
  it('before the confirmation the screens read the local order file, nothing moves', async () => {
    const db = await localFarm();
    const r = await loadOrders(db, F);
    expect(r.orders?.days?.['2026-11-23']?.['own:cu1']).toEqual({ 'own-crop:parsley': 12 });
    expect(await db.customers.count()).toBe(0);
  });
  it('after the confirmation the local records move to the server tables once, with their ids, and the own entries leave the local file', async () => {
    const db = await localFarm();
    await putLocal(db, READINESS_KEY, { migration: '0037' });
    const r = await loadOrders(db, F);
    expect((await db.customers.toArray()).map((c) => [c.id, c.name, c.phone])).toEqual([['cu1', 'Μαρία', '69']]);
    const orders = await db.customer_orders.toArray();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ customer_id: 'cu1', crop_id: 'crop-1', crates_str: '12', for_day: '2026-11-23', status: 'open' });
    expect((await db.worker_cards.toArray())[0]).toMatchObject({ worker_id: 'w1', surname: 'Π', phone: '70' });
    const stored = (await db.settings.get(ordersKey(F)))?.value as typeof EMPTY;
    expect(JSON.stringify(stored)).not.toContain('own:');
    expect(r.orders?.days?.['2026-11-23']?.['own:cu1']).toEqual({ 'own-crop:parsley': 12 });      // …and the screens still see the order, now from the server rows
    expect((await db.outbox.toArray()).filter((o) => o.table === 'customer_orders')).toHaveLength(1);              // queued for the server
    expect(await moveLocalOwnerRecords(db, F)).toBe(false);                                           // idempotent
    expect(await db.customers.count()).toBe(1);
  });
});
