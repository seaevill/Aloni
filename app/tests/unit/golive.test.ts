import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import type { OutboxRow, Row } from '../../src/db/schema';
import { putMany } from '../../src/repo';
import { batches, type Transport } from '../../src/sync/engine';
import { canGoLive, goLive, goLiveItems, loadSyncFlag, setSyncFlag, syncEnabled } from '../../src/sync/golive';
import { uploadMedia } from '../../src/sync/media';
import { makeBackup } from '../../src/repo/backup';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const parcel = (id: string): Row => ({ id, farm_id: F, name: id, area_str: '0.5' });
type Answer = { op_id: string; status: 'applied' | 'duplicate' | 'rejected'; code?: string; reason?: string };
const accept = (ops: readonly Record<string, unknown>[]): Answer[] => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' }));
const server = (over: Partial<Transport> = {}): Transport & { calls: string[]; sentRows: string[] } => {
  const calls: string[] = []; const sentRows: string[] = [];
  return { calls, sentRows,
    applyOps: async (ops) => { calls.push(`apply:${ops.length}`); ops.forEach((o) => sentRows.push(String(o.row_id))); return accept(ops); },
    pull: async () => { calls.push('pull'); return { rows: [], more: false, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } }; },
    rpc: async () => ({ ok: true }), ...over };
};

describe('the wizard checklist', () => {
  it('the button is active only when every item is ok', () => {
    const base = [{ key: 'controller' as const, ok: true }, { key: 'vat' as const, ok: true }];
    expect(canGoLive(goLiveItems(base, { signedIn: true, backupFresh: true }))).toBe(true);
    expect(canGoLive(goLiveItems(base, { signedIn: false, backupFresh: true }))).toBe(false);
    expect(canGoLive(goLiveItems(base, { signedIn: true, backupFresh: false }))).toBe(false);
    expect(canGoLive(goLiveItems([{ key: 'vat', ok: false }], { signedIn: true, backupFresh: true }))).toBe(false);
    expect(canGoLive([])).toBe(false);
  });
  it('the switch is a device setting, off by default, and never part of a backup', async () => {
    const db = await newDb();
    await loadSyncFlag(db); expect(syncEnabled.value).toBe(false);
    await setSyncFlag(db, true); expect(syncEnabled.value).toBe(true);
    await loadSyncFlag(db); expect(syncEnabled.value).toBe(true);
    const b = await makeBackup(db, { id: F, name: 'x' }, 'test');
    expect(b.settings.map((s) => s.key)).not.toContain('sync_enabled');
  });
});

describe('the first full upload', () => {
  it('sends the records once, in writing order (a parent before its child on the same instant), then pulls', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('p1'), op: 'insert' }, { table: 'plantings', row: { id: 'pl1', farm_id: F, parcel_id: 'p1', area_str: '0.25' }, op: 'insert' }]);
    const tr = server();
    const r = await goLive(db, tr, F, undefined);
    expect(r).toMatchObject({ ok: true, sent: 2 });
    expect(tr.calls).toEqual(['apply:0', 'apply:2', 'pull']);            // the empty call first, then everything, then the pull
    expect(tr.sentRows).toEqual(['p1', 'pl1']);
    expect(await db.outbox.where('status').equals('pending').count()).toBe(0);
  });
  it('batches put a parent before its child even when both carry the same instant', () => {
    const op = (id: string, table: string): OutboxRow => ({ op_id: id, farm_id: F, table, row_id: id, op: 'insert', row: {}, device_id: 'd', actor_id: 'a', at: '2026-11-20T10:00:00Z', status: 'pending' } as OutboxRow);
    expect(batches([op('s', 'job_spray'), op('j', 'jobs'), op('pl', 'plantings'), op('p', 'parcels')]).flat().map((o) => o.op_id)).toEqual(['p', 'pl', 'j', 's']);
  });
  it('NEVER sends when a Demo row is in the queue, or for the Demo farm', async () => {
    const db = await newDb();
    await db.outbox.put({ op_id: 'demo1', farm_id: DEMO_FARM_ID, table: 'parcels', row_id: 'd', op: 'insert', row: {}, device_id: 'd', actor_id: 'a', at: '2026-11-20T10:00:00Z', status: 'pending' } as OutboxRow);
    const tr = server();
    expect(await goLive(db, tr, F, undefined)).toMatchObject({ ok: false, step: 'demo_rows' });
    expect(await goLive(db, tr, DEMO_FARM_ID, undefined)).toMatchObject({ ok: false, step: 'demo_rows' });
    expect(tr.calls).toEqual([]);
  });
  it('a server that does not answer the empty call stops everything before any record is sent', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('p1'), op: 'insert' }]);
    const tr = server({ applyOps: async () => { throw new Error('apply_ops: HTTP 401'); } });
    expect(await goLive(db, tr, F, undefined)).toMatchObject({ ok: false, step: 'ping' });
    expect(await db.outbox.count()).toBe(1);                              // nothing lost
  });
  it('a refused record stops the upload and is reported; the refused one stays on the phone', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('p1'), op: 'insert' }]);
    const tr = server({ applyOps: async (ops) => (ops.length === 0 ? [] : ops.map((o) => ({ op_id: String(o.op_id), status: 'rejected' as const, code: '23514', reason: 'no' }))) });
    const r = await goLive(db, tr, F, undefined);
    expect(r).toMatchObject({ ok: false, step: 'push' });
    expect((await db.outbox.toArray())[0].status).not.toBe('acked');
  });
  it('an interrupted upload continues where it stopped: the sent records are not sent again', async () => {
    const db = await newDb();
    for (let i = 0; i < 3; i += 1) await putMany(db, [{ table: 'parcels', row: parcel(`p${i}`), op: 'insert' }]);
    let n = 0;
    const flaky = server({ applyOps: async (ops) => { if (ops.length === 0) return []; n += 1; if (n === 1) throw new Error('network'); return accept(ops); } });
    const first = await goLive(db, flaky, F, undefined);
    expect(first.ok).toBe(false);
    const again = server();
    const second = await goLive(db, again, F, undefined);
    expect(second.ok).toBe(true);
    expect(await db.outbox.where('status').equals('pending').count()).toBe(0);
    expect(again.sentRows.length + flaky.sentRows.length).toBeLessThanOrEqual(3);   // nothing was sent twice
  });
});

describe('photos', () => {
  it('go up one after the other in the order they were taken, with limited parallelism, exactly as stored, and only once', async () => {
    const db = await newDb();
    for (const [id, at] of [['m2', '2026-11-20T10:00:02Z'], ['m1', '2026-11-20T10:00:01Z'], ['m3', '2026-11-20T10:00:03Z']] as const) await db.media.put({ id, farm_id: F, sha256: id, mime: 'image/jpeg', width: 4, height: 3, bytes: 2, created_at: at, data: new Uint8Array([1, 2]).buffer });
    let running = 0; let peak = 0; const order: string[] = [];
    const put = async (m: { id: string; bytes: ArrayBuffer }) => { running += 1; peak = Math.max(peak, running); order.push(m.id); expect(m.bytes.byteLength).toBe(2); await new Promise((r) => setTimeout(r, 5)); running -= 1; };
    const first = await uploadMedia(db, put, F, 2);
    expect(first).toEqual({ uploaded: 3, left: 0 });
    expect(order).toEqual(['m1', 'm2', 'm3']); expect(peak).toBeLessThanOrEqual(2);
    expect((await uploadMedia(db, put, F, 2)).uploaded).toBe(0);          // remembered: never twice
  });
  it('an interrupted photo upload keeps what went up and continues with the rest', async () => {
    const db = await newDb();
    for (const id of ['a', 'b', 'c']) await db.media.put({ id, farm_id: F, sha256: id, mime: 'image/jpeg', width: 4, height: 3, bytes: 1, created_at: `2026-11-20T10:00:0${id.charCodeAt(0) - 96}Z`, data: new Uint8Array([1]).buffer });
    await expect(uploadMedia(db, async (m) => { if (m.id === 'b') throw new Error('network'); }, F, 1)).rejects.toThrow('network');
    const seen: string[] = [];
    await uploadMedia(db, async (m) => { seen.push(m.id); }, F, 1);
    expect(seen).toEqual(['b', 'c']);                                      // 'a' had gone up
  });
});
