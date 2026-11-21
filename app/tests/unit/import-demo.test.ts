import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, FARM_TABLES } from '../../src/db/schema';
import { statusOf } from '../../src/labels/label-use';
import { guardAppendOnly, put } from '../../src/repo';
import { balanceOf } from '../../src/stock/stock';
import { GREEK_NAME_FIXES, importDemo, removeDemo, type PrototypeData } from '../../src/db/import-demo';
import { newDb, putParcel } from '../helpers/factories';

const data = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
const src = (t: string) => (data[t] as Array<Record<string, unknown>> | undefined) ?? []; // label_uses: the prototype has none (its `registered[]` stays in the product)
const UUID5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let db: AppDB;
beforeEach(async () => { db = await newDb(); });

describe('demo import (schema v2: UUID ids)', () => {
  it('loads every table into the demo farm with matching counts', async () => {
    await importDemo(db, data);
    const EXTRA = ['workers', 'label_uses', 'stock_lots', 'stock_movements', 'job_plantings', 'job_spray', 'job_harvest', 'soil_tests']; // fictional records built from the prototype (demo-extra.ts)
    for (const t of FARM_TABLES.filter((x) => !EXTRA.includes(x) && x !== 'jobs')) expect(await db[t].where('farm_id').equals(DEMO_FARM_ID).count(), t).toBe(src(t).length);
    for (const t of EXTRA) expect(await db[t as 'workers'].where('farm_id').equals(DEMO_FARM_ID).count(), t).toBeGreaterThan(0);
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
    for (const j of (await db.jobs.toArray()).filter((x) => x.legacy_id)) {
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

describe('the demo farm shows every screen, and stays apart from the real farm', () => {
  const real = '11111111-1111-4111-8111-111111111111';
  it('has signed, unsigned and incomplete labels, an expired lot, a negative balance, sprays with known and unknown waiting periods, harvests, soil analyses and workers', async () => {
    await importDemo(db, data);
    const states = new Set((await db.label_uses.toArray()).map((l) => statusOf(l)));
    expect([...states].sort()).toEqual(['blocked', 'signed', 'unsigned']);
    const lots = await db.stock_lots.toArray();
    expect(lots.some((l) => typeof l.expiry === 'string' && l.expiry < '2026-11-17')).toBe(true);
    const moves = await db.stock_movements.toArray();
    expect(lots.some((l) => balanceOf(moves.filter((m) => m.lot_key === l.lot_key))?.startsWith('-'))).toBe(true);
    const sprays = await db.job_spray.toArray();
    expect(sprays.some((r) => typeof r.phi_until === 'string')).toBe(true);
    expect(sprays.some((r) => r.phi_until === undefined)).toBe(true);
    expect((await db.job_harvest.count())).toBeGreaterThan(0);
    expect((await db.workers.toArray()).map((w) => w.name).sort()).toEqual(['Ahmet', 'Bora', 'Γιώργος']);
  });
  it('every demo record carries the demo farm id; nothing reaches the outbox; every reference exists', async () => {
    await importDemo(db, data);
    for (const t of FARM_TABLES) for (const r of await db[t].toArray()) expect(r.farm_id, t).toBe(DEMO_FARM_ID);
    expect(await db.outbox.count()).toBe(0);
    const planting = new Set((await db.plantings.toArray()).map((p) => p.id));
    for (const l of await db.job_plantings.toArray()) expect(planting.has(l.planting_id as string)).toBe(true);
    for (const h of await db.job_harvest.toArray()) expect(planting.has(h.planting_id as string)).toBe(true);
  });
  it('removing the demo removes its append-only rows too, leaves real records alone, and the guard still refuses to change a REAL record', async () => {
    const guarded = new AppDB(`test-${crypto.randomUUID()}`); guardAppendOnly(guarded); await guarded.open();
    await put(guarded, 'stock_movements', { id: 'real-m', farm_id: real, lot_key: 'l', product_id: 'p', direction: 'in', qty_str: '1', reason: 'receipt', created_at: '2026-11-01T00:00:00Z' }, 'insert');
    await importDemo(guarded, data);
    await removeDemo(guarded);
    expect(await guarded.job_spray.count()).toBe(0);
    expect(await guarded.stock_movements.count()).toBe(1); // the real one
    await expect(guarded.stock_movements.delete('real-m')).rejects.toThrow(/append-only/);
    await expect(guarded.stock_movements.update('real-m', { qty_str: '9' })).rejects.toThrow(/append-only/);
  });
});

describe('demo labels (fictional, Demo farm only)', () => {
  it('most demo label uses are complete and signed, a few stay unsigned or incomplete; every one belongs to the Demo farm and carries the Demo source', async () => {
    await importDemo(db, data);
    const rows = await db.label_uses.toArray();
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.farm_id === DEMO_FARM_ID)).toBe(true);                  // nothing for a real farm
    expect(rows.every((r) => r.source === 'ΕΠΙΔΕΙΞΗ')).toBe(true);
    const states = rows.map((l) => statusOf(l));
    const signed = states.filter((s) => s === 'signed').length;
    expect(signed / rows.length).toBeGreaterThan(0.5);                                  // the Demo is not «άγνωστο» everywhere
    expect(states).toContain('unsigned'); expect(states).toContain('blocked');          // the other states can still be shown
  });
  it('a real farm on the same phone gets no label use from the Demo import', async () => {
    await importDemo(db, data);
    expect(await db.label_uses.where('farm_id').notEqual(DEMO_FARM_ID).count()).toBe(0);
  });
});
