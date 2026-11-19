import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, type Row } from '../../src/db/schema';
import { base64ToBlob, blobToBase64, sha256Hex } from '../../src/db/sha256';
import { BackupError, makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { TEST_FARM_ID, newDb, putParcel } from '../helpers/factories';
import { deviceId, put, putSetting } from '../../src/repo';

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
    expect(first).toEqual({ rows: 1, added: 1, updated: 0, same: 0, farmId: TEST_FARM_ID, skipped: [] });
    expect((await b.parcels.toArray())[0].area_str).toBe(0.625); // exactly as stored
    expect((await b.settings.get('controller'))?.value).toEqual({ name: 'Test Person' });
    expect(await b.outbox.count()).toBeGreaterThan(0); // restored records still have to reach the server
    await restoreBackup(b, backup, TEST_FARM_ID); // same farm again: same UUIDs, no duplicates
    expect(await b.parcels.count()).toBe(1);
    expect((await b.farms.toArray()).filter((f) => !f.is_demo).map((f) => f.id)).toEqual([TEST_FARM_ID]);
  });

  it('photos travel inside and are checked: a damaged photo rejects the whole restore and writes nothing', async () => {
    const a = new AppDB(`test-${crypto.randomUUID()}`); await a.open();
    const blob = new Blob(['label photo bytes'], { type: 'image/jpeg' });
    await put(a, 'media', { id: crypto.randomUUID(), farm_id: TEST_FARM_ID, sha256: await sha256Hex(blob), mime: 'image/jpeg', data: await blob.arrayBuffer(), width: 4, height: 3, bytes: blob.size, created_at: '2026-11-20T10:00:00Z' }, 'insert');
    await put(a, 'parcels', real());
    const backup = await roundTrip(a);
    expect(backup.media).toHaveLength(1);
    const b = new AppDB(`test-${crypto.randomUUID()}`); await b.open();
    await restoreBackup(b, backup, 'empty');
    expect(await sha256Hex(new Blob([(await b.media.toArray())[0].data]))).toBe(backup.media[0].sha256);
    const c = new AppDB(`test-${crypto.randomUUID()}`); await c.open();
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

describe('restore never overwrites, keeps the original identities, and says what it skipped', () => {
  const stampedParcel = (over: Partial<Row>) => real({ id: 'p-1', name: 'Old', updated_at: '2026-11-01T00:00:00Z', ...over });
  it('every record carries actor_id and device_id (stock and photos too); a restore keeps the ORIGINAL ids and queues under them', async () => {
    const a = await newDb();
    await put(a, 'parcels', stampedParcel({}));
    await put(a, 'stock_movements', { id: 'm1', farm_id: TEST_FARM_ID, lot_key: 'l', product_id: 'p', direction: 'in', qty_str: '1', reason: 'receipt', created_at: '2026-11-01T00:00:00Z' }, 'insert');
    await put(a, 'media', { id: 'ph1', farm_id: TEST_FARM_ID, sha256: await sha256Hex(new Blob(['x'])), mime: 'image/jpeg', data: await new Blob(['x']).arrayBuffer(), width: 1, height: 1, bytes: 1, created_at: '2026-11-01T00:00:00Z' }, 'insert');
    const backup = await roundTrip(a);
    for (const r of [...backup.tables.parcels, ...backup.tables.stock_movements, ...backup.media]) expect(r, String(r.id)).toMatchObject({ device_id: expect.any(String), actor_id: expect.any(String) });
    const b = await newDb();
    await restoreBackup(b, backup, 'empty');
    const [mine, theirs] = [await deviceId(b), backup.device_id];
    expect(mine).not.toBe(theirs);
    expect((await b.parcels.get('p-1'))?.device_id).toBe(theirs);
    expect((await b.stock_movements.get('m1'))?.actor_id).toBe((await a.stock_movements.get('m1'))?.actor_id);
    const ops = (await b.outbox.toArray()).filter((o) => o.table !== 'settings');
    expect(ops.length).toBe(3);
    for (const o of ops) expect(o.device_id, o.table).toBe(theirs); // not relabelled with the restoring phone
  });
  it('a newer record on the phone is NEVER replaced; it is listed, and not queued again', async () => {
    const a = await newDb();
    await put(a, 'parcels', stampedParcel({}));
    const old = await roundTrip(a);
    const b = await newDb();
    await restoreBackup(b, old, 'empty');
    await put(b, 'parcels', { ...(await b.parcels.get('p-1'))!, name: 'Newer on the phone', updated_at: '2026-11-10T00:00:00Z' });
    const queued = await b.outbox.count();
    const r = await restoreBackup(b, old, TEST_FARM_ID);
    expect(r).toMatchObject({ rows: 0, skipped: [{ table: 'parcels', id: 'p-1', label: 'Newer on the phone' }] });
    expect((await b.parcels.get('p-1'))?.name).toBe('Newer on the phone');
    expect(await b.outbox.count()).toBe(queued);
  });
  it('an older record on the phone IS replaced by a newer one from the backup; an identical one is neither replaced nor reported', async () => {
    const a = await newDb();
    await put(a, 'parcels', stampedParcel({ name: 'Newer in backup', updated_at: '2026-11-12T00:00:00Z' }));
    const backup = await roundTrip(a);
    const b = await newDb();
    await put(b, 'parcels', stampedParcel({}));
    expect(await restoreBackup(b, backup, TEST_FARM_ID)).toMatchObject({ rows: 1, skipped: [] });
    expect((await b.parcels.get('p-1'))?.name).toBe('Newer in backup');
    expect(await restoreBackup(b, backup, TEST_FARM_ID)).toMatchObject({ rows: 0, skipped: [] });
  });
  it('a ledger row that differs from the one on the phone is skipped and listed, never changed', async () => {
    const a = await newDb();
    const m = { id: 'm1', farm_id: TEST_FARM_ID, lot_key: 'l', product_id: 'p', direction: 'in', qty_str: '5', reason: 'receipt', created_at: '2026-11-01T00:00:00Z' };
    await put(a, 'stock_movements', m, 'insert');
    const backup = await roundTrip(a);
    const b = await newDb();
    await put(b, 'stock_movements', { ...m, qty_str: '7' }, 'insert');
    expect((await restoreBackup(b, backup, TEST_FARM_ID)).skipped).toHaveLength(1);
    expect((await b.stock_movements.get('m1'))?.qty_str).toBe('7');
  });
  it('a phone that only holds a photo is not «empty»: the photo would be left under a farm id that disappears', async () => {
    const a = await newDb(); await put(a, 'parcels', real());
    const backup = await roundTrip(a);
    const b = await newDb();
    await put(b, 'media', { id: 'ph9', farm_id: 'local-farm', sha256: 'x', mime: 'image/jpeg', data: new ArrayBuffer(1), width: 1, height: 1, bytes: 1, created_at: '2026-11-01T00:00:00Z' }, 'insert');
    await expect(restoreBackup(b, backup, 'local-farm')).rejects.toMatchObject({ code: 'conflict' });
  });
  it("on adoption nothing stays queued under the old farm id; this phone's own settings are queued under the new one", async () => {
    const a = await newDb(); await put(a, 'parcels', real());
    const backup = await roundTrip(a);
    const b = await newDb();
    await putSetting(b, 'local-farm', 'controller', { name: 'Mine' });
    await restoreBackup(b, backup, 'local-farm');
    const ops = await b.outbox.toArray();
    expect(ops.some((o) => o.farm_id === 'local-farm')).toBe(false);
    expect(ops.filter((o) => o.table === 'settings').map((o) => o.farm_id)).toEqual([TEST_FARM_ID]);
  });
});

describe('device-only settings never leave the phone in a backup file', () => {
  it('the sign-in session (tokens), the worker view and the sync cursors are not exported', async () => {
    const { putLocal } = await import('../../src/repo');
    const db = await newDb();
    await db.farms.put({ id: TEST_FARM_ID, name: 'Aloni', is_demo: false });
    await putLocal(db, 'auth_session', { access_token: 'SECRET-TOKEN', refresh_token: 'SECRET-REFRESH' });
    await putLocal(db, 'worker_view', { id: 'w1', farm: TEST_FARM_ID });
    await putLocal(db, `sync_cursor:${TEST_FARM_ID}`, { x: '1' });
    await putLocal(db, 'controller', { name: 'T' });
    const b = await makeBackup(db, { id: TEST_FARM_ID, name: 'Aloni' }, 'test');
    expect(b.settings.map((s) => s.key)).toEqual(['controller']);
    expect(JSON.stringify(b)).not.toContain('SECRET');
  });
});
