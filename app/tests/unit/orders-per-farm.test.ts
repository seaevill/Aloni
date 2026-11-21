import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { DEMO_FARM_ID } from '../../src/config';
import { demoOrders, loadOrders, migrateUnkeyedOrders, saveOrders } from '../../src/orders/store';
import { cratesByCrop } from '../../src/orders/klouves';
import { supplyByCrop } from '../../src/orders/available';
import { putLocal } from '../../src/repo';
import data from '../../../reference/prototype/data.json';
import { TEST_NOW } from '../helpers/clock';
import { newDb } from '../helpers/factories';

const real = { products: [{ id: 'p1', name: 'Σπανάκι' }], weeks: { '2026-11-16': { p1: 9 } }, skipped: 0 };
describe('orders belong to one farm (T5)', () => {
  it('an import in farm A is not visible in farm B', async () => {
    const db = await newDb();
    await saveOrders(db, 'farm-A', real, { p1: 'spinach' });
    expect((await loadOrders(db, 'farm-B')).orders).toBeUndefined();
    expect((await loadOrders(db, 'farm-A')).orders).toEqual(real);
  });
  it('an old unkeyed import moves to the REAL farm and never to the demo', async () => {
    const db = await newDb();
    await putLocal(db, 'klouves_orders', real); await putLocal(db, 'klouves_cropmap', { p1: 'spinach' });
    await migrateUnkeyedOrders(db, 'real-farm');
    expect((await loadOrders(db, 'real-farm')).orders).toEqual(real);
    expect((await loadOrders(db, DEMO_FARM_ID)).orders).toBeUndefined();
    expect(await db.settings.get('klouves_orders')).toBeUndefined();
  });
  it('the demo gets its own fictional sample; its crop slugs are fixed, so spinach has a planting that can be cut', async () => {
    const db = await newDb();
    await importDemo(db, data as unknown as PrototypeData);
    const s = demoOrders(Date.parse('2026-11-16T09:00:00Z'));
    await saveOrders(db, DEMO_FARM_ID, s.orders, s.map);
    const crops = await db.crops.where('farm_id').equals(DEMO_FARM_ID).toArray();
    expect(crops.map((c) => c.slug)).toContain('spinach');
    const sup = supplyByCrop(TEST_NOW, crops, await db.plantings.where('farm_id').equals(DEMO_FARM_ID).toArray(), await db.job_plantings.where('farm_id').equals(DEMO_FARM_ID).toArray(), await db.job_spray.where('farm_id').equals(DEMO_FARM_ID).toArray(), await db.job_harvest.where('farm_id').equals(DEMO_FARM_ID).toArray(), await db.label_uses.where('farm_id').equals(DEMO_FARM_ID).toArray());
    expect(sup.spinach?.free).toBeGreaterThan(0);
    expect(cratesByCrop(s.orders.weeks['2026-11-16'], s.map).bySlug.spinach).toBeGreaterThan(0);
    expect((await loadOrders(db, 'real-farm')).orders).toBeUndefined();
  });
});

describe('delete demo', () => {
  it('removes the demo\'s order sample with it and leaves the real farm\'s import', async () => {
    const { ordersKey, mapKey } = await import('../../src/orders/store');
    const db = await newDb();
    await saveOrders(db, DEMO_FARM_ID, real, {}); await saveOrders(db, 'real-farm', real, { p1: 'spinach' });
    const { delLocal } = await import('../../src/repo');
    await delLocal(db, ordersKey(DEMO_FARM_ID)); await delLocal(db, mapKey(DEMO_FARM_ID));
    expect((await loadOrders(db, DEMO_FARM_ID)).orders).toBeUndefined();
    expect((await loadOrders(db, 'real-farm')).orders).toEqual(real);
  });
});
