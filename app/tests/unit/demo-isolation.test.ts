import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, FARM_TABLES } from '../../src/db/schema';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { put } from '../../src/repo';
import { newDb, putParcel, TEST_FARM_ID } from '../helpers/factories';

// T14: the demo farm may be written to (practice), but it never touches the real farm, never reaches the outbox and its fictional label values never show up in the real farm.
const data = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
let db: AppDB;
beforeEach(async () => { db = await newDb(); });

describe('demo isolation', () => {
  it('a spray saved in the demo stays in the demo: the real farm has no demo rows, no label uses, and the outbox has no demo row', async () => {
    await putParcel(db, { name: 'Real parcel' });
    await importDemo(db, data);
    await put(db, 'job_spray', { id: crypto.randomUUID(), farm_id: DEMO_FARM_ID, job_id: crypto.randomUUID(), sprayed_at: '2026-11-19T08:00:00Z', dose_str: '0.2', dose_unit: 'ml_str', label_state: 'none' }, 'insert');
    for (const t of FARM_TABLES) {
      const real = await db[t].where('farm_id').equals(TEST_FARM_ID).count();
      expect(real, t).toBe(t === 'parcels' ? 1 : 0);
    }
    expect(await db.label_uses.where('farm_id').equals(TEST_FARM_ID).count()).toBe(0);
    expect(await db.outbox.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
  it('no demo label value (dose, PHI, REI) is found by a query on the real farm', async () => {
    await importDemo(db, data);
    const demoUses = await db.label_uses.where('farm_id').equals(DEMO_FARM_ID).toArray();
    expect(demoUses.length).toBeGreaterThan(0);
    const real = (await db.label_uses.toArray()).filter((r) => r.farm_id !== DEMO_FARM_ID);
    expect(real).toEqual([]);
  });
  it('resetting the demo (importing again) replaces what was practised and leaves the real farm alone', async () => {
    await putParcel(db, { name: 'Real parcel' });
    await importDemo(db, data);
    const before = await db.job_spray.where('farm_id').equals(DEMO_FARM_ID).count();
    await put(db, 'job_spray', { id: crypto.randomUUID(), farm_id: DEMO_FARM_ID, job_id: crypto.randomUUID(), sprayed_at: '2026-11-19T08:00:00Z', dose_str: '0.2', dose_unit: 'ml_str', label_state: 'none' }, 'insert');
    expect(await db.job_spray.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(before + 1);
    await importDemo(db, data);
    expect(await db.job_spray.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(before);
    expect(await db.parcels.where('farm_id').equals(TEST_FARM_ID).count()).toBe(1);
  });
});
