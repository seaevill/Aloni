import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppDB } from '../../src/db/schema';
import { newDb, putParcel } from '../helpers/factories';
import { GREEK_NAME_FIXES, importDemo, removeDemo, type PrototypeData } from '../../src/db/import-demo';

const data = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
let db: AppDB;
beforeEach(async () => { db = await newDb(); });

describe('demo import', () => {
  it('loads every table into the demo farm with matching counts', async () => {
    await importDemo(db, data);
    for (const t of ['parcels', 'crops', 'plantings', 'products', 'jobs', 'orders_weekly', 'alerts', 'recommendations'] as const) {
      expect(await db[t].where('farmId').equals('demo').count(), t).toBe((data[t] as unknown[]).length);
    }
    expect(await db.weather.count()).toBe(Object.keys(data.weather.by_parcel).length);
    expect((await db.farms.get('demo'))?.isDemo).toBe(true);
  });

  it('copies label data exactly: no rounding, no invented values', async () => {
    await importDemo(db, data);
    for (const src of data.products as Array<{ id: string; registered: Array<Record<string, unknown>> }>) {
      const row = (await db.products.get(`demo:${src.id}`)) as unknown as typeof src;
      expect(row.registered).toEqual(src.registered);
    }
    for (const src of data.jobs as Array<{ id: string; dose?: number }>) {
      const row = await db.jobs.get(`demo:${src.id}`);
      expect(row?.dose).toBe(src.dose);
    }
  });

  it('keeps explicit nulls as null (unknown), never defaults', async () => {
    await importDemo(db, data);
    const withNull = (data.products as Array<{ id: string; registered: Array<Record<string, unknown>> }>)
      .flatMap((p) => p.registered.filter((r) => r.phi_days === null).map(() => p.id));
    expect(withNull.length).toBeGreaterThan(0);
    const row = (await db.products.get(`demo:${withNull[0]}`)) as unknown as { registered: Array<Record<string, unknown>> };
    expect(row.registered.some((r) => r.phi_days === null)).toBe(true);
  });

  it('corrects the 4 misspelled Greek substance names, only in name_el, and nothing else changes', async () => {
    await importDemo(db, data);
    const rows = await db.products.where('farmId').equals('demo').toArray();
    const all = JSON.stringify(rows.map((r) => r.name_el));
    for (const [wrong, right] of GREEK_NAME_FIXES) {
      expect(all, `${wrong} should be gone`).not.toContain(wrong);
      expect(all, `${right} should appear`).toContain(right);
    }
    // the source file keeps the old spelling (reference/ is read-only) and doses are untouched
    expect(JSON.stringify(data.products)).toContain('Μανδιπροπαμίδιο');
    for (const src of data.products as Array<{ id: string; name_en: string; registered: unknown }>) {
      const row = await db.products.get(`demo:${src.id}`);
      expect(row?.name_en).toBe(src.name_en);
      expect(row?.registered).toEqual(src.registered);
    }
  });

  it('never touches the real farm, is re-runnable and removable', async () => {
    await db.farms.put({ id: 'main', name: 'Aloni', isDemo: false });
    const real = await putParcel(db, { name: 'Real parcel' });
    await importDemo(db, data);
    await importDemo(db, data); // twice: no duplicates
    expect(await db.parcels.where('farmId').equals('demo').count()).toBe(data.parcels ? (data.parcels as unknown[]).length : 0);
    await removeDemo(db);
    expect(await db.parcels.where('farmId').equals('demo').count()).toBe(0);
    expect(await db.parcels.get(real.uid)).toBeTruthy();
    expect(await db.farms.get('main')).toBeTruthy();
  });
});
