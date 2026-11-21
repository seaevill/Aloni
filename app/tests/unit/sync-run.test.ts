import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { putMany } from '../../src/repo';
import type { Transport } from '../../src/sync/engine';
import { createRunner, lastSyncOk, syncError } from '../../src/sync/run';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const tr = (over: Partial<Transport> = {}): Transport => ({ applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' as const })), pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), ...over }) as Transport; // (a queued server call, rpc, is covered in sync-engine.test.ts)

describe('the sync runner', () => {
  it('does nothing offline or signed out, and says so', async () => {
    const db = await newDb(); let changed = 0;
    expect(await createRunner({ db, transport: async () => tr(), farm: () => F, online: () => false, changed: () => { changed++; } }).tick()).toBe('skipped');
    expect(await createRunner({ db, transport: async () => undefined, farm: () => F, online: () => true, changed: () => { changed++; } }).tick()).toBe('skipped');
    expect(changed).toBe(0);
  });

  it('sends what is pending, tells the screens, and clears an old error', async () => {
    const db = await newDb(); let changed = 0;
    await putMany(db, [{ table: 'parcels', row: { id: 'p1', farm_id: F, name: 'P', area_str: '1' }, op: 'insert' }]);
    syncError.value = 'old failure';
    expect(await createRunner({ db, transport: async () => tr(), farm: () => F, online: () => true, changed: () => { changed++; } }).tick()).toBe('ok');
    expect(changed).toBe(1);
    expect(syncError.value).toBeUndefined();
    expect((await db.outbox.toArray())[0]?.status).toBe('acked');
  });

  it('a failure is remembered, never thrown, and the ops stay pending for the next round', async () => {
    const db = await newDb();
    await putMany(db, [{ table: 'parcels', row: { id: 'p2', farm_id: F, name: 'P', area_str: '1' }, op: 'insert' }]);
    const run = createRunner({ db, transport: async () => tr({ applyOps: async () => { throw new Error('offline'); } }), farm: () => F, online: () => true, changed: () => undefined });
    expect(await run.tick()).toBe('failed');
    expect(syncError.value).toBe('offline');
    expect((await db.outbox.toArray())[0]?.status).toBe('pending');
  });

  it('never overlaps itself: a second tick during a round is skipped', async () => {
    const db = await newDb(); let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => { release = r; });
    const run = createRunner({ db, transport: async () => tr({ pull: async () => { await gate; return { rows: [], more: false, reset: false, cursor: null }; } }), farm: () => F, online: () => true, changed: () => undefined });
    const first = run.tick();
    await new Promise((r) => setTimeout(r, 10));
    expect(await run.tick()).toBe('skipped');
    release();
    expect(await first).toBe('ok');
  });

  it('a request that came during a round is not lost: one more round follows it', async () => {
    const db = await newDb(); let rounds = 0; let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => { release = r; });
    const run = createRunner({ db, transport: async () => tr({ pull: async () => { rounds++; if (rounds === 1) await gate; return { rows: [], more: false, reset: false, cursor: null }; } }), farm: () => F, online: () => true, changed: () => undefined });
    const first = run.tick();
    await new Promise((r) => setTimeout(r, 10));
    await run.tick();
    release(); await first;
    await new Promise((r) => setTimeout(r, 50));
    expect(rounds).toBe(2);
  });

  it('B5: lastSyncOk is set only by a round where the server accepted everything; a refusal, a signed-out or switched-off round and another farm all clear it (review MUST 1 and 2)', async () => {
    const db = await newDb(); let farm = F; let signedIn = true;
    const accept = tr();
    const refuse = tr({ applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'rejected' as const, code: 'P0001', reason: 'no' })) });
    let which: Transport = accept;
    const run = createRunner({ db, transport: async () => (signedIn ? which : undefined), farm: () => farm, online: () => true, changed: () => undefined });
    lastSyncOk.value = undefined;
    expect(await run.tick()).toBe('ok');
    expect(lastSyncOk.value).toBeDefined();                                        // a good round
    signedIn = false;
    expect(await run.tick()).toBe('skipped');
    expect(lastSyncOk.value).toBeUndefined();                                      // signed out: the old time is gone
    signedIn = true;
    expect(await run.tick()).toBe('ok');
    expect(lastSyncOk.value).toBeDefined();
    farm = '';                                                                     // sync switched off (the runner is given no farm)
    expect(await run.tick()).toBe('skipped');
    expect(lastSyncOk.value).toBeUndefined();
    farm = F;
    expect(await run.tick()).toBe('ok');
    farm = 'another-farm';
    which = accept;
    await run.tick();
    await putMany(db, [{ table: 'parcels', row: { id: 'p9', farm_id: 'another-farm', name: 'P', area_str: '1' }, op: 'insert' }]);
    lastSyncOk.value = undefined;
    which = refuse;
    expect(await run.tick()).toBe('ok');                                           // the round ran, but the server refused a record:
    expect(lastSyncOk.value).toBeUndefined();                                      // it is NOT a good round
  });
});
