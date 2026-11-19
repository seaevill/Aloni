import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, type Row } from '../../src/db/schema';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { actorId, deviceId, guardAppendOnly, pendingCount, pendingOps, put, putMany, putSetting, unsyncedIds } from '../../src/repo';
import { readFileSync } from 'node:fs';
import { TEST_FARM_ID, newDb } from '../helpers/factories';
import type { Table } from 'dexie';

const row = (over: Partial<Row> = {}): Row => ({ id: crypto.randomUUID(), farm_id: TEST_FARM_ID, name: 'Test parcel', ...over });

describe('repo.put: one write path', () => {
  it('writes the row AND an outbox entry with device_id and actor_id (two different ids, stable on this phone)', async () => {
    const db = await newDb();
    const a = row(); await put(db, 'parcels', a);
    const b = row(); await put(db, 'parcels', b);
    expect(await db.parcels.get(a.id)).toEqual({ ...a, device_id: expect.any(String), actor_id: expect.any(String) }); // exactly the row plus who wrote it
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(2);
    const opA = ops.find((o) => o.row_id === a.id)!; // the outbox is ordered by op_id (random), not by time
    const opB = ops.find((o) => o.row_id === b.id)!;
    expect(opA).toEqual({ op_id: expect.any(String), farm_id: TEST_FARM_ID, table: 'parcels', row_id: a.id, op: 'update', row: { ...a, device_id: expect.any(String), actor_id: expect.any(String) }, device_id: expect.any(String), actor_id: expect.any(String), at: expect.any(String), status: 'pending' });
    expect(opA.device_id).toBe(opB.device_id);
    expect(opA.actor_id).toBe(opB.actor_id);
    expect(opA.device_id).not.toBe(opA.actor_id);
    expect(await deviceId(db)).toBe(opA.device_id);
    expect(await actorId(db)).toBe(opA.actor_id);
    expect(await pendingCount(db)).toBe(2);
  });

  it('row and outbox are atomic: if the outbox write fails the row is not written either', async () => {
    const db = await newDb();
    vi.spyOn(db.outbox, 'add').mockRejectedValue(new Error('disk full'));
    await expect(put(db, 'parcels', row())).rejects.toThrow('disk full');
    expect(await db.parcels.count()).toBe(0);
  });

  it('the DEMO farm never writes to the outbox, and neither does the demo import; the real farm is untouched', async () => {
    const db = await newDb();
    await put(db, 'parcels', row({ farm_id: DEMO_FARM_ID }));
    expect(await db.parcels.count()).toBe(1);
    expect(await db.outbox.count()).toBe(0);
    await importDemo(db, JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.parcels.where('farm_id').equals(TEST_FARM_ID).count()).toBe(0);
    await put(db, 'parcels', row());
    expect(await db.outbox.count()).toBe(1);
  });

  it('the screens see how many records are waiting and which ones (the unsynced dot); demo rows never show up', async () => {
    const db = await newDb();
    const a = row();
    await put(db, 'parcels', a);
    await put(db, 'parcels', row({ farm_id: DEMO_FARM_ID }));
    expect(pendingOps.value).toBe(1);
    expect([...unsyncedIds.value]).toEqual([a.id]);
  });

  it('owner settings are queued too', async () => {
    const db = await newDb();
    await putSetting(db, TEST_FARM_ID, 'controller', { name: 'Test' });
    expect(await db.outbox.toArray()).toEqual([{ actor_id: expect.any(String), device_id: expect.any(String), op_id: expect.any(String), at: expect.any(String), farm_id: TEST_FARM_ID, op: 'update', row: { key: 'controller', value: { name: 'Test' } }, row_id: 'controller', status: 'pending', table: 'settings' }]);
  });
});

describe('append-only tables: insert and amend, never change or delete', () => {
  const open = async () => { const db = new AppDB(`test-${crypto.randomUUID()}`); guardAppendOnly(db); await db.open(); return db; };

  it('insert works and is queued; the same id twice is refused', async () => {
    const db = await open();
    const r = row({ qty: 5 });
    await put(db, 'stock_movements', r, 'insert');
    expect(await db.outbox.count()).toBe(1);
    await expect(put(db, 'stock_movements', r, 'insert')).rejects.toThrow();
  });
  it('an update through repo.put throws and writes nothing', async () => {
    const db = await open();
    const r = row({ qty: 5 });
    await put(db, 'stock_movements', r, 'insert');
    await expect(put(db, 'stock_movements', { ...r, qty: 6 }, 'update')).rejects.toThrow(/append-only/);
    expect((await db.stock_movements.get(r.id))?.qty).toBe(5);
    expect(await db.outbox.count()).toBe(1);
  });
  it('even a direct Dexie update or delete throws (the hook is the safety net)', async () => {
    const db = await open();
    const r = row({ qty: 5 });
    await put(db, 'stock_movements', r, 'insert');
    await expect(db.table('stock_movements').put({ ...r, qty: 9 })).rejects.toThrow(/append-only/);
    await expect(db.table('stock_movements').delete(r.id)).rejects.toThrow(/append-only/);
    expect((await db.stock_movements.get(r.id))?.qty).toBe(5);
  });
  it('a correction is a NEW row that points at the old one', async () => {
    const db = await open();
    const r = row({ qty: 5 });
    await put(db, 'stock_movements', r, 'insert');
    await put(db, 'stock_movements', row({ qty: -5, amends_id: r.id }), 'insert');
    expect(await db.stock_movements.count()).toBe(2);
  });
});

describe('putMany: several records in ONE transaction', () => {
  it('all of them with their outbox entries, or none (a lot is never left without its first movement)', async () => {
    const db = await newDb();
    const a = row(); const b = row();
    await putMany(db, [{ table: 'parcels', row: a, op: 'insert' }, { table: 'parcels', row: b, op: 'insert' }]);
    expect(await db.parcels.count()).toBe(2);
    expect(await db.outbox.count()).toBe(2);
    const c = row();
    await expect(putMany(db, [{ table: 'parcels', row: c, op: 'insert' }, { table: 'parcels', row: a, op: 'insert' }])).rejects.toThrow(); // second one is a duplicate id
    expect(await db.parcels.get(c.id)).toBeUndefined(); // the first one was rolled back
    expect(await db.outbox.count()).toBe(2);
  });
  it('refuses an update of an append-only table before writing anything', async () => {
    const db = await newDb();
    const p = row();
    await expect(putMany(db, [{ table: 'parcels', row: p, op: 'insert' }, { table: 'stock_movements', row: row(), op: 'update' }])).rejects.toThrow(/append-only/);
    expect(await db.parcels.count()).toBe(0);
  });
});

describe('the outbox keeps the order of the writes', () => {
  it('two writes in the same millisecond get strictly increasing times', async () => {
    const { newDb, TEST_FARM_ID: F } = await import('../helpers/factories');
    const db = await newDb();
    for (let i = 0; i < 20; i++) await put(db, 'parcels', { id: `p${i}`, farm_id: F, name: 'P', area_str: '1' }, 'insert');
    const times = (await db.outbox.toArray()).sort((a, b) => a.row_id.localeCompare(b.row_id, undefined, { numeric: true })).map((o) => o.at);
    expect(new Set(times).size).toBe(20);
    expect([...times].sort()).toEqual(times);
  });
});
