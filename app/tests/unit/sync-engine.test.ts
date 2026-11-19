import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { OutboxRow, Row } from '../../src/db/schema';
import { putMany, putRpc } from '../../src/repo';
import { dismissRejected } from '../../src/repo/sync-apply';
import { batches, pull, push, syncOnce, toWire, type PullAnswer, type Transport } from '../../src/sync/engine';
import { httpTransport } from '../../src/sync/http';
import { queuedKey } from '../../src/ui/states';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const parcel = (id: string, extra: Record<string, unknown> = {}): Row => ({ id, farm_id: F, name: id, area_str: '0.5', ...extra });
type Answer = { op_id: string; status: 'applied' | 'duplicate' | 'rejected'; code?: string; reason?: string };
const accept = (ops: readonly Record<string, unknown>[]): Answer[] => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' }));
const server = (over: Partial<Transport> = {}): Transport & { sent: Array<readonly Record<string, unknown>[]> } => {
  const sent: Array<readonly Record<string, unknown>[]> = [];
  return { sent, applyOps: async (ops) => { sent.push(ops); return accept(ops); }, pull: async () => ({ rows: [], more: false, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } }), rpc: async () => ({ ok: true }), ...over };
};
const outbox = (id: string, at: string, group?: string): OutboxRow => ({ op_id: id, farm_id: F, table: 'parcels', row_id: id, op: 'insert', row: {}, device_id: 'd', actor_id: 'a', at, status: 'pending', ...(group ? { group_id: group, group_size: 2 } : {}) });

describe('the outbox goes to the server', () => {
  it('one phone transaction becomes one group on the wire; a single write has no group', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('a'), op: 'insert' }, { table: 'parcels', row: parcel('b'), op: 'insert' }]);
    await putMany(db, [{ table: 'parcels', row: parcel('c'), op: 'insert' }]);
    const wire = (await db.outbox.toArray()).map(toWire);
    const [a, b, c] = ['a', 'b', 'c'].map((id) => wire.find((w) => w.row_id === id)!);
    expect(a.group_id).toBeTruthy(); expect(a.group_id).toBe(b.group_id); expect(a.group_size).toBe(2); expect(b.group_size).toBe(2);
    expect(c.group_id).toBeUndefined();
  });

  it('batches keep writing order and never split a group', () => {
    const ops = [outbox('1', '2026-11-20T10:00:01Z', 'g'), outbox('2', '2026-11-20T10:00:02Z', 'g'), outbox('3', '2026-11-20T10:00:00Z')];
    expect(batches(ops).map((b) => b.map((o) => o.op_id))).toEqual([['3', '1', '2']]);
    const many = Array.from({ length: 60 }, (_, i) => outbox(`g${i}`, `2026-11-20T10:00:${String(i).padStart(2, '0')}Z`, 'big'));
    const out = batches([outbox('x', '2026-11-20T09:00:00Z'), ...many]);
    expect(out.map((b) => b.length)).toEqual([1, 60]); // the 60-op group is sent whole in its own call, never cut in two
  });

  it('accepted and already-known ops leave the queue; a refusal stays, with its reason, and is shown until dismissed', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('p1'), op: 'insert' }]); await putMany(db, [{ table: 'parcels', row: parcel('p2'), op: 'insert' }]); await putMany(db, [{ table: 'parcels', row: parcel('p3'), op: 'insert' }]);
    const ids = new Map((await db.outbox.toArray()).map((o) => [o.row_id, o.op_id]));
    const tr = server({ applyOps: async () => [{ op_id: ids.get('p1')!, status: 'applied' }, { op_id: ids.get('p2')!, status: 'duplicate' }, { op_id: ids.get('p3')!, status: 'rejected', code: '42501', reason: 'column created_by is set by the server' }] });
    expect(await push(db, tr, F)).toEqual({ sent: 2, rejected: 1 });
    const by = new Map((await db.outbox.toArray()).map((o) => [o.row_id, o]));
    expect([by.get('p1')!.status, by.get('p2')!.status, by.get('p3')!.status]).toEqual(['acked', 'acked', 'rejected']);
    expect(by.get('p3')).toMatchObject({ code: '42501', reason: 'column created_by is set by the server' });
    expect(await db.parcels.get('p3')).toBeTruthy(); // the record itself stays on the phone
    expect(await push(db, tr, F)).toEqual({ sent: 0, rejected: 0 }); // a refused op is not retried by itself
    await dismissRejected(db, ids.get('p3')!);
    expect(await db.outbox.get(ids.get('p3')!)).toBeUndefined();
  });

  it('an op the server did not answer is a refusal (never «sent»), and a network error leaves everything pending', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('q1'), op: 'insert' }]);
    await expect(push(db, server({ applyOps: async () => { throw new Error('offline'); } }), F)).rejects.toThrow('offline');
    expect((await db.outbox.toArray()).map((o) => o.status)).toEqual(['pending']);
    expect(await push(db, server({ applyOps: async () => [] }), F)).toEqual({ sent: 0, rejected: 1 });
    expect((await db.outbox.toArray())[0]).toMatchObject({ status: 'rejected', code: 'no_answer' });
  });
});

describe('queued server calls (the worker\'s «Έγινε»)', () => {
  it('are sent one by one, in order, outside the apply_ops batches; ok = acked, refused = kept with the server\'s words, a failure keeps them pending', async () => {
    const db = await newDb();
    await putRpc(db, F, 'complete_spray_job', 'job1', { p_job: 'job1', p_ended_at: '2026-11-20T08:00:00Z' });
    await putRpc(db, F, 'complete_spray_job', 'job2', { p_job: 'job2', p_ended_at: '2026-11-20T08:05:00Z' });
    const calls: string[] = [];
    const tr = server({ rpc: async (n, a) => { calls.push(`${n}:${String(a.p_job)}`); return a.p_job === 'job2' ? { ok: false, code: '23514', reason: 'the field is locked' } : { ok: true }; } });
    expect(await push(db, tr, F)).toEqual({ sent: 1, rejected: 1 });
    expect(calls).toEqual(['complete_spray_job:job1', 'complete_spray_job:job2']);
    expect(tr.sent).toHaveLength(0); // nothing went through apply_ops
    const by = new Map((await db.outbox.toArray()).map((o) => [o.row_id, o]));
    expect(by.get('job1')!.status).toBe('acked');
    expect(by.get('job2')).toMatchObject({ status: 'rejected', code: '23514', reason: 'the field is locked' });
    await putRpc(db, F, 'complete_spray_job', 'job3', { p_job: 'job3' });
    await expect(push(db, server({ rpc: async () => { throw new Error('offline'); } }), F)).rejects.toThrow('offline');
    expect((await db.outbox.toArray()).find((o) => o.row_id === 'job3')).toMatchObject({ status: 'pending' });
  });

  it('the HTTP transport turns a 4xx answer into a refusal and a 5xx or a network error into a retry', async () => {
    const mk = (status: number, json: unknown) => httpTransport({ url: 'https://x.example', apiKey: 'pub', token: async () => 't' }, (async () => ({ ok: status < 400, status, json: async () => json })) as unknown as typeof fetch);
    expect(await mk(200, {}).rpc('complete_spray_job', {})).toEqual({ ok: true });
    expect(await mk(400, { code: '23514', message: 'locked' }).rpc('complete_spray_job', {})).toEqual({ ok: false, code: '23514', reason: 'locked' });
    await expect(mk(503, {}).rpc('complete_spray_job', {})).rejects.toThrow('HTTP 503');
    await expect(mk(429, {}).rpc('complete_spray_job', {})).rejects.toThrow('HTTP 429');
  });
});

describe('the server comes back to the phone', () => {
  const answer = (rows: PullAnswer['rows'], more = false, reset = false): PullAnswer => ({ rows, more, reset, cursor: { x: '9', s: rows.length, g: 'g1', v: 'owner' } });
  const row = (table: string, r: Row, seq = 1) => ({ table, x: '5', seq, row: r });

  it('pulled rows are stored without the server-only columns; the cursor is kept, and pages are followed', async () => {
    const db = await newDb();
    const calls: unknown[] = [];
    const pages = [answer([row('parcels', parcel('s1', { server_seq: 7, created_by: 'u', hash: 'h' }))], true), answer([row('parcels', parcel('s2'))])];
    const tr = server({ pull: async (_f, cursor) => { calls.push(cursor); return pages[calls.length - 1]!; } });
    expect(await pull(db, tr, F)).toEqual({ written: 2, reset: false });
    expect(await db.parcels.get('s1')).toEqual(parcel('s1'));
    expect(calls[0]).toBeNull(); expect(calls[1]).toEqual({ x: '9', s: 1, g: 'g1', v: 'owner' });
    expect((await db.settings.get(`sync_cursor:${F}`))?.value).toEqual({ x: '9', s: 1, g: 'g1', v: 'owner' });
  });

  it('a reset (new generation) is reported and the same rows again change nothing', async () => {
    const db = await newDb();
    const tr = server({ pull: async () => answer([row('parcels', parcel('r1'))], false, true) });
    expect((await pull(db, tr, F)).reset).toBe(true);
    await pull(db, tr, F);
    expect(await db.parcels.where('farm_id').equals(F).count()).toBe(1);
  });

  it('this phone\'s own unsent change is not overwritten; append-only records are only added; another farm\'s rows are ignored', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('mine', { name: 'local edit' }), op: 'update' }]);
    await putMany(db, [{ table: 'observations', row: { id: 'o1', farm_id: F, parcel_id: 'p', kind: 'pest', note: 'phone', created_at: '2026-11-20T10:00:00Z' }, op: 'insert' }]);
    const tr = server({ pull: async () => answer([
      row('parcels', parcel('mine', { name: 'server version' })), row('observations', { id: 'o1', farm_id: F, note: 'server copy' } as Row),
      row('observations', { id: 'o2', farm_id: F, note: 'new from server' } as Row), row('parcels', { id: 'x', farm_id: 'another-farm', name: 'x' }),
    ]) });
    await pull(db, tr, F);
    expect((await db.parcels.get('mine'))?.name).toBe('local edit');
    expect((await db.observations.get('o1'))?.note).toBe('phone');
    expect((await db.observations.get('o2'))?.note).toBe('new from server');
    expect(await db.parcels.get('x')).toBeUndefined();
  });

  it('syncOnce = push then pull', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: parcel('z1'), op: 'insert' }]);
    const tr = server({ pull: async () => answer([row('parcels', parcel('z2'))]) });
    expect(await syncOnce(db, tr, F)).toMatchObject({ sent: 1, rejected: 0, written: 1, reset: false });
  });
});

describe('the HTTP transport and the wording', () => {
  it('calls the RPC endpoints with the user\'s token and fails loudly on an HTTP error', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const f = (async (url: string, init: RequestInit) => { seen.push({ url, init }); return { ok: true, status: 200, json: async () => [] }; }) as unknown as typeof fetch;
    const tr = httpTransport({ url: 'https://x.example', apiKey: 'pub', token: async () => 'jwt' }, f);
    await tr.applyOps([{ op_id: '1' }]);
    expect(seen[0]!.url).toBe('https://x.example/rest/v1/rpc/apply_ops');
    expect(seen[0]!.init.headers).toMatchObject({ apikey: 'pub', authorization: 'Bearer jwt' });
    expect(JSON.parse(String(seen[0]!.init.body))).toEqual({ p_ops: [{ op_id: '1' }] });
    const bad = httpTransport({ url: 'https://x.example', apiKey: 'pub', token: async () => 'jwt' }, (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch);
    await expect(bad.pull(F, null, 5)).rejects.toThrow('pull: HTTP 401');
  });

  it('«saved · will be sent when there is signal» is the wording only while the sync is live', () => {
    expect(queuedKey(true)).toBe('sync.queuedSignal');
    expect(queuedKey(false)).toBe('worker.queued');
  });
});
