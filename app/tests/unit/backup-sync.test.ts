import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { put, putLocal } from '../../src/repo';
import { isDeviceOnlyKey, makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { pull, type Transport } from '../../src/sync/engine';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const parcel = (id: string, over: Partial<Row> = {}): Row => ({ id, farm_id: F, name: id, area_str: '0.5', updated_at: '2026-11-01T00:00:00Z', ...over });
const backupOf = async (rows: Row[]) => {
  const a = await newDb();
  for (const r of rows) await put(a, 'parcels', r);
  return parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'T' }, 'test')));
};
const opsOf = async (db: Awaited<ReturnType<typeof newDb>>) => (await db.outbox.toArray()).filter((o) => o.table === 'parcels').map((o) => `${o.row_id}:${o.op}`).sort();
const answer = (more: boolean) => ({ rows: [], more, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } });
const tr = (pages: boolean[]): Transport => ({ applyOps: async () => [], pull: async () => answer(pages.shift() ?? false), rpc: async () => ({ ok: true }) });

describe('restore op follows the local state (evaluation 5-data F3)', () => {
  it('a row that is NOT on the phone is queued as «insert» (the server keeps its newer copy); one that is here and older is an «update»', async () => {
    const backup = await backupOf([parcel('new'), parcel('old', { name: 'Newer in backup', updated_at: '2026-11-12T00:00:00Z' })]);
    const b = await newDb();
    await put(b, 'parcels', parcel('old'));
    await b.outbox.clear();
    const r = await restoreBackup(b, backup, F);
    expect(r).toMatchObject({ added: 1, updated: 1 });
    expect(await opsOf(b)).toEqual(['new:insert', 'old:update']);
  });
  it('on an empty phone (the adopting restore) every row goes in as «insert»', async () => {
    const backup = await backupOf([parcel('a'), parcel('b')]);
    const b = await newDb();
    await restoreBackup(b, backup, 'some-empty-farm');
    expect(await opsOf(b)).toEqual(['a:insert', 'b:insert']);
  });
});

describe('restore waits for the first full pull when sync is on', () => {
  it('sync on and no completed pull: refused with «sync_pending», nothing written, nothing queued', async () => {
    const backup = await backupOf([parcel('a')]);
    const b = await newDb();
    await putLocal(b, 'sync_enabled', true);
    await expect(restoreBackup(b, backup, F)).rejects.toMatchObject({ code: 'sync_pending' });
    expect(await b.parcels.count()).toBe(0);
    expect(await b.outbox.count()).toBe(0);
  });
  it('escape attempt: a pull that stopped half-way (more = true) does not count as completed', async () => {
    const backup = await backupOf([parcel('a')]);
    const half = await newDb();
    await putLocal(half, 'sync_enabled', true);
    await half.settings.put({ key: `sync_cursor:${F}`, value: { x: '1' } }); // a cursor alone (a page arrived, the pull did not finish) is not enough
    await expect(restoreBackup(half, backup, F)).rejects.toMatchObject({ code: 'sync_pending' });
  });
  it('after a pull that ended (more = false) the restore goes ahead; with sync off it never waits', async () => {
    const backup = await backupOf([parcel('a')]);
    const b = await newDb();
    await putLocal(b, 'sync_enabled', true);
    await pull(b, tr([true, false]), F);
    expect(await restoreBackup(b, backup, F)).toMatchObject({ added: 1 });
    const off = await newDb();
    expect(await restoreBackup(off, backup, F)).toMatchObject({ added: 1 });
  });
  it('the pull marker is a device setting: it never travels in a backup', async () => {
    expect(isDeviceOnlyKey(`pull_done:${F}`)).toBe(true);
    const b = await newDb();
    await pull(b, tr([false]), F);
    expect((await makeBackup(b, { id: F, name: 'T' }, 't')).settings.map((s) => s.key)).toEqual([]);
  });
});
