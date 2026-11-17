import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { sha256Hex } from '../../src/db/sha256';
import { addPhoto, fitWithin, MAX_SIDE } from '../../src/media/photo';
import { guardAppendOnly, put } from '../../src/repo';
import { AppDB } from '../../src/db/schema';
import { makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { TEST_FARM_ID, newDb } from '../helpers/factories';

const now = '2026-11-20T10:00:00.000Z';
const enc = (text: string) => ({ blob: new Blob([text], { type: 'image/jpeg' }), width: 40, height: 30 });

describe('fitWithin: at most 2000 px on the longer side, never enlarged', () => {
  it('shrinks landscape and portrait, keeps proportions, leaves small photos alone', () => {
    expect(fitWithin(4000, 3000, MAX_SIDE)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000, MAX_SIDE)).toEqual({ width: 1000, height: 2000 });
    expect(fitWithin(2000, 2000, MAX_SIDE)).toEqual({ width: 2000, height: 2000 });
    expect(fitWithin(640, 480, MAX_SIDE)).toEqual({ width: 640, height: 480 });
  });
  it('a fraction stays a fraction here (the canvas drops it) and a thin strip never becomes 0 px', () => {
    expect(fitWithin(4001, 3000, MAX_SIDE)).toMatchObject({ width: 2000 });
    expect(fitWithin(100000, 1, MAX_SIDE)).toEqual({ width: 2000, height: 1 });
  });
  it('unusable sizes give nothing (never a made-up size)', () => {
    for (const [w, h] of [[0, 10], [10, 0], [-1, 5], [NaN, 5], [5, Infinity], [1.5, 2]]) expect(fitWithin(w, h, MAX_SIDE), `${w}x${h}`).toBeUndefined();
  });
});

describe('addPhoto', () => {
  it('stores the bytes with their SHA-256, queues the record WITHOUT the bytes, and keeps the same photo once', async () => {
    const db = await newDb();
    const a = enc('photo one');
    const first = await addPhoto(db, TEST_FARM_ID, a, now);
    expect(first).toMatchObject({ ok: true, duplicate: false });
    const row = (await db.media.toArray())[0];
    expect(row).toMatchObject({ farm_id: TEST_FARM_ID, mime: 'image/jpeg', width: 40, height: 30, bytes: a.blob.size, sha256: await sha256Hex(a.blob) });
    const ops = (await db.outbox.toArray()).filter((o) => o.table === 'media');
    expect(ops).toHaveLength(1);
    expect(ops[0].row).toMatchObject({ id: row.id, sha256: row.sha256 });
    expect((ops[0].row as { data?: unknown }).data).toBeUndefined();

    const again = await addPhoto(db, TEST_FARM_ID, enc('photo one'), now); // same bytes
    expect(again).toEqual({ ok: true, id: row.id, duplicate: true });
    expect(await db.media.count()).toBe(1);
    expect((await db.outbox.toArray()).filter((o) => o.table === 'media')).toHaveLength(1);
    expect(await addPhoto(db, TEST_FARM_ID, enc('photo two'), now)).toMatchObject({ duplicate: false });
    expect(await db.media.count()).toBe(2);
  });
  it('the same bytes on another farm are a different record; the demo farm never queues anything', async () => {
    const db = await newDb();
    await addPhoto(db, TEST_FARM_ID, enc('x'), now);
    expect(await addPhoto(db, '22222222-2222-4222-8222-222222222222', enc('x'), now)).toMatchObject({ duplicate: false });
    await addPhoto(db, DEMO_FARM_ID, enc('demo'), now);
    expect((await db.outbox.toArray()).filter((o) => o.farm_id === DEMO_FARM_ID)).toHaveLength(0);
  });
  it('photos are append-only: a direct change or delete throws', async () => {
    const db = new AppDB(`test-${crypto.randomUUID()}`);
    guardAppendOnly(db);
    await db.open();
    const r = await addPhoto(db, TEST_FARM_ID, enc('keep'), now);
    if (!r.ok) throw new Error('setup');
    await expect(db.media.update(r.id, { width: 1 })).rejects.toThrow(/append-only/);
    await expect(db.media.delete(r.id)).rejects.toThrow(/append-only/);
    await expect(put(db, 'media', (await db.media.get(r.id))!, 'update')).rejects.toThrow(/append-only/);
  });
  it('a failed write says so and leaves nothing behind (storage full)', async () => {
    const db = await newDb();
    db.media.hook('creating', () => { throw new Error('QuotaExceededError'); });
    expect(await addPhoto(db, TEST_FARM_ID, enc('big'), now)).toEqual({ ok: false });
    expect(await db.media.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});

describe('photos and backup', () => {
  it('survive a backup → restore with size and date, restoring twice changes nothing, and a restored photo is queued for the server', async () => {
    const a = await newDb();
    await addPhoto(a, TEST_FARM_ID, enc('label photo'), now);
    const backup = parseBackup(JSON.stringify(await makeBackup(a, { id: TEST_FARM_ID, name: 'Test' }, 'test')));
    const b = await newDb();
    await restoreBackup(b, backup, 'empty');
    await restoreBackup(b, backup, TEST_FARM_ID);
    const [m] = await b.media.toArray();
    expect(await b.media.count()).toBe(1);
    expect(m).toMatchObject({ width: 40, height: 30, created_at: now, sha256: await sha256Hex(enc('label photo').blob) });
    expect((await b.outbox.toArray()).filter((o) => o.table === 'media')).toHaveLength(1);
  });
});
