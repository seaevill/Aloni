import 'fake-indexeddb/auto';
import type { Table } from 'dexie';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, type Row } from '../../src/db/schema';
import { base64ToBlob, blobToBase64, sha256Hex } from '../../src/db/sha256';
import { BackupError, makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { TEST_FARM_ID, newDb, putParcel } from '../helpers/factories';
import { put, putSetting } from '../../src/repo';

class PhotoDB extends AppDB { // `media` arrives with the photo module (PR 11); the backup format already carries it
  media!: Table<{ id: string; farm_id: string; sha256: string; mime: string; blob: Blob }, string>;
  constructor() { super(`test-${crypto.randomUUID()}`); this.version(3).stores({ media: 'id, farm_id' }); }
}
const farm = { id: TEST_FARM_ID, name: 'Test farm' };
const real = (over: Partial<Row> = {}): Row => ({ id: crypto.randomUUID(), farm_id: TEST_FARM_ID, name: 'Real parcel', ...over });
const roundTrip = async (db: AppDB) => parseBackup(JSON.stringify(await makeBackup(db, farm, '0.0.0 · test')));

describe('backup and restore', () => {
  it('exports the REAL farm only (never demo rows or device ids) and restores it on an empty phone, idempotently', async () => {
    const a = await newDb();
    await put(a, 'parcels', real({ area_str: 0.625 }));
    await put(a, 'parcels', real({ farm_id: DEMO_FARM_ID, name: 'demo' }));
    await putSetting(a, TEST_FARM_ID, 'controller', { name: 'Test Person' });
    const backup = await roundTrip(a);
    expect(backup.tables.parcels).toHaveLength(1);
    expect(backup.settings.map((s) => s.key)).toEqual(['controller']); // no device_id / actor_id
    const b = await newDb();
    const first = await restoreBackup(b, backup, 'some-other-empty-farm');
    expect(first).toEqual({ rows: 1, farmId: TEST_FARM_ID });
    expect((await b.parcels.toArray())[0].area_str).toBe(0.625); // exactly as stored
    expect((await b.settings.get('controller'))?.value).toEqual({ name: 'Test Person' });
    expect(await b.outbox.count()).toBeGreaterThan(0); // restored records still have to reach the server
    await restoreBackup(b, backup, TEST_FARM_ID); // same farm again: same UUIDs, no duplicates
    expect(await b.parcels.count()).toBe(1);
    expect((await b.farms.toArray()).filter((f) => !f.is_demo).map((f) => f.id)).toEqual([TEST_FARM_ID]);
  });

  it('photos travel inside and are checked: a damaged photo rejects the whole restore and writes nothing', async () => {
    const a = new PhotoDB(); await a.open();
    const blob = new Blob(['label photo bytes'], { type: 'image/jpeg' });
    await a.media.put({ id: crypto.randomUUID(), farm_id: TEST_FARM_ID, sha256: await sha256Hex(blob), mime: 'image/jpeg', blob });
    await put(a, 'parcels', real());
    const backup = await roundTrip(a);
    expect(backup.media).toHaveLength(1);
    const b = new PhotoDB(); await b.open();
    await restoreBackup(b, backup, 'empty');
    expect(await sha256Hex((await b.media.toArray())[0].blob)).toBe(backup.media[0].sha256);
    const c = new PhotoDB(); await c.open();
    const bad = { ...backup, media: [{ ...backup.media[0], data_base64: await blobToBase64(new Blob(['tampered'])) }] };
    await expect(restoreBackup(c, bad, 'empty')).rejects.toMatchObject({ code: 'sha256' });
    expect(await c.parcels.count()).toBe(0);
    expect(await c.media.count()).toBe(0);
    expect(await sha256Hex(base64ToBlob(await blobToBase64(blob), 'image/jpeg'))).toBe(backup.media[0].sha256);
  });

  it('refuses: a phone that already holds other farm data, a demo backup, a wrong file, another version', async () => {
    const a = await newDb(); await put(a, 'parcels', real());
    const backup = await roundTrip(a);
    const busy = await newDb(); await putParcel(busy, {}, 'a-different-farm');
    await expect(restoreBackup(busy, backup, 'a-different-farm')).rejects.toMatchObject({ code: 'conflict' });
    expect(await busy.parcels.count()).toBe(1);
    const demoBackup = JSON.stringify({ ...backup, tables: { parcels: [real({ farm_id: DEMO_FARM_ID })] } });
    expect(() => parseBackup(demoBackup)).toThrow(BackupError);
    expect(() => parseBackup('not json')).toThrow(expect.objectContaining({ code: 'format' }));
    expect(() => parseBackup('{"format":"other"}')).toThrow(expect.objectContaining({ code: 'format' }));
    expect(() => parseBackup(JSON.stringify({ ...backup, version: 99 }))).toThrow(expect.objectContaining({ code: 'version' }));
    expect(() => parseBackup(JSON.stringify({ ...backup, farm: { id: DEMO_FARM_ID, name: 'x' } }))).toThrow(expect.objectContaining({ code: 'demo' }));
  });
});
