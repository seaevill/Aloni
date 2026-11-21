import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { OutboxRow, Row } from '../../src/db/schema';
import { pendingCount, putMany } from '../../src/repo';
import { pull, push, syncOnce, type PulledRow, type Transport } from '../../src/sync/engine';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

// LIVE rehearsal without a browser or a real server: two phones of one farm (real engine, real outbox, real local databases) talk to an in-memory stand-in for the server that answers like the real one
// (one effect per op_id, a row = last write wins, pull pages by server sequence). 200 records, offline/online switches, an interrupted push, and the same record edited on both phones.
// The timings printed here are for the STATUS page; the stand-in is instant, so they measure the PHONE side (outbox, local writes, applying pulled rows), not the network.
class Server {
  rows = new Map<string, Row & { server_seq: number }>(); seen = new Set<string>(); seq = 0; down = false; applied = 0;
  transport(): Transport {
    return {
      applyOps: async (ops) => {
        if (this.down) throw new Error('network down');
        return ops.map((o) => {
          const id = String(o.op_id);
          if (this.seen.has(id)) return { op_id: id, status: 'duplicate' as const };
          this.seen.add(id); this.applied += 1;
          const row = o.row as Row; this.seq += 1;
          this.rows.set(`${String(o.table)}:${row.id}`, { ...row, server_seq: this.seq, _table: String(o.table) } as Row & { server_seq: number });
          return { op_id: id, status: 'applied' as const };
        });
      },
      pull: async (_farm, cursor, limit) => {
        if (this.down) throw new Error('network down');
        const after = typeof cursor === 'object' && cursor !== null ? Number((cursor as { s?: number }).s ?? 0) : 0;
        const all = [...this.rows.values()].filter((r) => r.server_seq > after).sort((a, b) => a.server_seq - b.server_seq);
        const page = all.slice(0, limit);
        const rows: PulledRow[] = page.map((r) => { const { server_seq, _table, ...row } = r as Row & { server_seq: number; _table: string }; return { table: _table, x: '1', seq: server_seq, row: row as Row }; });
        return { rows, more: all.length > page.length, reset: false, cursor: { x: '1', s: page.length ? page[page.length - 1]!.server_seq : after, g: 'g1', v: 'owner' } };
      },
      rpc: async () => ({ ok: true as const }),
    };
  }
}

const parcel = (i: number, extra: Record<string, unknown> = {}): Row => ({ id: `rehearsal-${String(i).padStart(3, '0')}`, farm_id: F, name: `Χωράφι ${i}`, area_str: '0.5', ...extra });
const ms = (t0: number) => Math.round(performance.now() - t0);

describe('live rehearsal: two phones, 200 records', () => {
  it('200 records written without signal stay on the phone, go up in one round when the signal returns, and arrive on the second phone exactly once', async () => {
    const server = new Server(); const a = await newDb(); const b = await newDb();
    server.down = true;
    let t = performance.now();
    for (let i = 0; i < 200; i += 10) await putMany(a, Array.from({ length: 10 }, (_, k) => ({ table: 'parcels' as const, row: parcel(i + k), op: 'insert' as const })));
    const tWrite = ms(t);
    expect(await pendingCount(a)).toBe(200);
    await expect(syncOnce(a, server.transport(), F)).rejects.toThrow();                 // no signal: the round fails, nothing is lost
    expect(await pendingCount(a)).toBe(200); expect(await a.parcels.count()).toBe(200);
    server.down = false;
    t = performance.now(); const up = await push(a, server.transport(), F); const tPush = ms(t);
    expect(up).toEqual({ sent: 200, rejected: 0 }); expect(await pendingCount(a)).toBe(0); expect(server.applied).toBe(200);
    t = performance.now(); const down = await pull(b, server.transport(), F); const tPull = ms(t);
    expect(down.written).toBe(200); expect(await b.parcels.count()).toBe(200);
    expect((await b.parcels.toArray()).map((p) => p.id).sort()).toEqual((await a.parcels.toArray()).map((p) => p.id).sort());
    expect((await pull(b, server.transport(), F)).written).toBe(0);                    // asking again brings nothing new
    console.log(`REHEARSAL 200 records: write on phone ${tWrite} ms, push ${tPush} ms, pull+apply ${tPull} ms`);
  });

  it('a push cut in half resumes without duplicates: the server holds every record exactly once', async () => {
    const server = new Server(); const a = await newDb();
    for (let i = 0; i < 200; i += 10) await putMany(a, Array.from({ length: 10 }, (_, k) => ({ table: 'parcels' as const, row: parcel(i + k), op: 'insert' as const })));
    const real = server.transport(); let calls = 0;
    const flaky: Transport = { ...real, applyOps: async (ops) => { calls += 1; if (calls === 2) { server.down = true; } return real.applyOps(ops); } };
    await push(a, flaky, F).catch(() => undefined);                                     // the signal drops in the middle
    const left = await pendingCount(a); expect(left).toBeGreaterThan(0); expect(left).toBeLessThan(200);
    server.down = false;
    await push(a, server.transport(), F);
    expect(await pendingCount(a)).toBe(0);
    expect(server.rows.size).toBe(200); expect(server.applied).toBe(200);              // no record twice
  });

  it('the same record edited on both phones: the later write wins on the server and both phones end up with it; no edit stays unsent', async () => {
    const server = new Server(); const a = await newDb(); const b = await newDb();
    await putMany(a, [{ table: 'parcels', row: parcel(1), op: 'insert' }]);
    await syncOnce(a, server.transport(), F); await syncOnce(b, server.transport(), F);
    expect((await b.parcels.get('rehearsal-001'))?.name).toBe('Χωράφι 1');
    await putMany(b, [{ table: 'parcels', row: { ...parcel(1), name: 'Edit B', updated_at: '2026-11-21T10:00:00.000Z' }, op: 'update' }]);     // both edit offline
    await putMany(a, [{ table: 'parcels', row: { ...parcel(1), name: 'Edit A', updated_at: '2026-11-21T11:00:00.000Z' }, op: 'update' }]);
    await syncOnce(b, server.transport(), F);                                           // B reaches the server first, A later
    await syncOnce(a, server.transport(), F);
    await syncOnce(b, server.transport(), F);
    const [ra, rb] = [await a.parcels.get('rehearsal-001'), await b.parcels.get('rehearsal-001')];
    expect(ra?.name).toBe(rb?.name);                                                    // both phones agree
    expect(ra?.name).toBe('Edit A');                                                    // the later write won
    expect(await pendingCount(a)).toBe(0); expect(await pendingCount(b)).toBe(0);
    const ob: OutboxRow[] = await a.outbox.toArray(); expect(ob.every((o) => o.status === 'acked')).toBe(true);
  });
});
