import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { AppDB, type Row } from '../../src/db/schema';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { actorId, deviceId, guardAppendOnly, pendingCount, pendingOps, put, putSetting, unsyncedIds } from '../../src/repo';
import { readFileSync } from 'node:fs';
import { TEST_FARM_ID, newDb } from '../helpers/factories';
import type { Table } from 'dexie';

const row = (over: Partial<Row> = {}): Row => ({ id: crypto.randomUUID(), farm_id: TEST_FARM_ID, name: 'Test parcel', ...over });

describe('repo.put: one write path', () => {
  it('writes the row AND an outbox entry with device_id and actor_id (two different ids, stable on this phone)', async () => {
    const db = await newDb();
    const a = row(); await put(db, 'parcels', a);
    const b = row(); await put(db, 'parcels', b);
    expect(await db.parcels.get(a.id)).toEqual(a);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(2);
    const opA = ops.find((o) => o.row_id === a.id)!; // the outbox is ordered by op_id (random), not by time
    const opB = ops.find((o) => o.row_id === b.id)!;
    expect(opA).toMatchObject({ table: 'parcels', op: 'update', status: 'pending', farm_id: TEST_FARM_ID });
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
    expect(await db.outbox.toArray()).toMatchObject([{ table: 'settings', row_id: 'controller', op: 'update' }]);
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
