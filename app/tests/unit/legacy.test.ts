import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyDb } from '../../src/db/legacy';
import type { AppDB } from '../../src/db/schema';
import { newDb } from '../helpers/factories';

// The old `aloni-farm` database (M0 to PR 2): rows had `farmId` 'demo' or 'main'.
async function makeLegacy(name: string, rows: Array<{ table: string; row: Record<string, unknown> }>) {
  const old = new Dexie(name);
  old.version(2).stores({ farms: 'id', parcels: 'uid, farmId', settings: 'key' });
  await old.open();
  for (const { table, row } of rows) await old.table(table).put(row);
  old.close();
}
let db: AppDB;
let name: string;
beforeEach(async () => { db = await newDb(); name = `legacy-${crypto.randomUUID()}`; });

describe('migrateLegacyDb: delete only when nothing but demo data is in it', () => {
  it('no old database: nothing to do', async () => {
    expect(await migrateLegacyDb(db, name)).toEqual({ status: 'none', settingsCopied: 0 });
  });
  it('only demo rows + the empty farm record + settings: settings are carried over, the old database is deleted', async () => {
    await makeLegacy(name, [
      { table: 'farms', row: { id: 'main', name: 'Aloni', isDemo: false } },
      { table: 'parcels', row: { uid: 'demo:P1', farmId: 'demo', id: 'P1' } },
      { table: 'settings', row: { key: 'controller', value: { name: 'Test Person', address: 'Test 1', phone: '1' } } },
    ]);
    expect(await migrateLegacyDb(db, name)).toEqual({ status: 'deleted', settingsCopied: 1 });
    expect(await db.settings.get('controller')).toEqual({ key: 'controller', value: { name: 'Test Person', address: 'Test 1', phone: '1' } });
    expect(await Dexie.exists(name)).toBe(false);
  });
  it('any real row: the old database is KEPT, untouched', async () => {
    await makeLegacy(name, [{ table: 'parcels', row: { uid: 'main:X', farmId: 'main', id: 'X', name: 'Real parcel' } }]);
    expect(await migrateLegacyDb(db, name)).toEqual({ status: 'kept', settingsCopied: 0 });
    expect(await Dexie.exists(name)).toBe(true);
    const old = new Dexie(name); await old.open();
    expect(await old.table('parcels').count()).toBe(1);
    old.close();
  });
  it('settings already in the new database are not overwritten', async () => {
    await db.settings.put({ key: 'controller', value: 'new' });
    await makeLegacy(name, [{ table: 'settings', row: { key: 'controller', value: 'old' } }]);
    expect((await migrateLegacyDb(db, name)).settingsCopied).toBe(0);
    expect((await db.settings.get('controller'))?.value).toBe('new');
  });
});
