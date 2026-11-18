import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { putMany } from '../../src/repo';
import type { Transport } from '../../src/sync/engine';
import { createRunner, syncError } from '../../src/sync/run';
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
});
