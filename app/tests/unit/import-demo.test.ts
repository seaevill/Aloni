import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { FARM_TABLES, type AppDB } from '../../src/db/schema';
import { GREEK_NAME_FIXES, importDemo, removeDemo, type PrototypeData } from '../../src/db/import-demo';
import { newDb, putParcel } from '../helpers/factories';

const data = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
const src = (t: string) => data[t] as Array<Record<string, unknown>>;
const UUID5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let db: AppDB;
beforeEach(async () => { db = await newDb(); });

describe('demo import (schema v2: UUID ids)', () => {
  it('loads every table into the demo farm with matching counts', async () => {
    await importDemo(db, data);
    for (const t of FARM_TABLES) expect(await db[t].where('farm_id').equals(DEMO_FARM_ID).count(), t).toBe(src(t).length);
    expect(await db.weather.count()).toBe(Object.keys(data.weather.by_parcel).length);
    expect((await db.farms.get(DEMO_FARM_ID))?.is_demo).toBe(true);
  });

  it('every id is a UUIDv5, the prototype id is kept as legacy_id, and re-importing gives the SAME ids', async () => {
    await importDemo(db, data);
    const first = (await db.parcels.toArray()).map((r) => [r.legacy_id, r.id]);
    for (const [legacy, id] of first) { expect(id).toMatch(UUID5); expect(legacy).toMatch(/^P\d$/); }
    await importDemo(db, data);
    expect((await db.parcels.toArray()).map((r) => [r.legacy_id, r.id])).toEqual(first);
    expect(await db.parcels.count()).toBe(src('parcels').length);
  });

  it('references point at real rows (P1 became a UUID everywhere, including products.registered[].crop_id)', async () => {
    await importDemo(db, data);
    const ids = (t: 'parcels' | 'crops' | 'plantings' | 'products') => db[t].toArray().then((rs) => new Set(rs.map((r) => r.id)));
    const [parcels, crops, plantings, products] = await Promise.all([ids('parcels'), ids('crops'), ids('plantings'), ids('products')]);
    for (const p of await db.plantings.toArray()) { expect(parcels.has(p.parcel_id as string)).toBe(true); expect(crops.has(p.crop_id as string)).toBe(true); }
    for (const j of await db.jobs.toArray()) {
      expect(parcels.has(j.parcel_id as string)).toBe(true);
      if (j.planting_id) expect(plantings.has(j.planting_id as string)).toBe(true);
      if (j.product_id) expect(products.has(j.product_id as string)).toBe(true);
    }
    for (const p of await db.products.toArray()) for (const u of p.registered as Array<{ crop_id: string }>) expect(crops.has(u.crop_id)).toBe(true);
    for (const w of await db.weather.toArray()) expect(parcels.has(w.parcel_id)).toBe(true);
  });

  it('copies label data exactly: no rounding, no invented values', async () => {
    await importDemo(db, data);
    const crops = new Map((await db.crops.toArray()).map((c) => [c.legacy_id, c.id]));
    for (const p of src('products') as Array<{ id: string; registered: Array<Record<string, unknown>> }>) {
      const row = (await db.products.where('legacy_id').equals(p.id).first()) as unknown as typeof p;
      expect(row.registered).toEqual(p.registered.map((u) => ({ ...u, crop_id: crops.get(u.crop_id as string) })));
    }
    for (const j of src('jobs') as Array<{ id: string; dose?: number }>) expect((await db.jobs.where('legacy_id').equals(j.id).first())?.dose).toBe(j.dose);
  });

  it('keeps explicit nulls as null (unknown), never defaults', async () => {
    await importDemo(db, data);
    const withNull = src('products').filter((p) => (p.registered as Array<Record<string, unknown>>).some((r) => r.phi_days === null));
    expect(withNull.length).toBeGreaterThan(0);
    const row = (await db.products.where('legacy_id').equals(withNull[0].id as string).first()) as unknown as { registered: Array<Record<string, unknown>> };
    expect(row.registered.some((r) => r.phi_days === null)).toBe(true);
  });

  it('corrects the 4 misspelled Greek substance names, only in name_el', async () => {
    await importDemo(db, data);
    const all = JSON.stringify((await db.products.toArray()).map((r) => r.name_el));
    for (const [wrong, right] of GREEK_NAME_FIXES) { expect(all).not.toContain(wrong); expect(all).toContain(right); }
    expect(JSON.stringify(src('products'))).toContain('Μανδιπροπαμίδιο'); // reference/ is read-only
  });

  it('never touches the real farm, is re-runnable and removable', async () => {
    const real = await putParcel(db, { name: 'Real parcel' });
    await importDemo(db, data);
    await removeDemo(db);
    expect(await db.parcels.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0);
    expect(await db.parcels.get(real.id)).toBeTruthy();
  });
});
