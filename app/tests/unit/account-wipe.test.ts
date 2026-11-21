import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AppDB } from '../../src/db/schema';
import { TEST_FARM_ID, newDb } from '../helpers/factories';
import { wipeAllowed } from '../../src/account/wipe';
import { wipeThisPhone } from '../../src/repo/wipe-local';

// E7: deleting the data on THIS phone. Never by accident: the records are exported first (a fresh backup), the farm name is typed, and nothing that was not yet sent to the server is lost.
const now = Date.parse('2026-11-21T12:00:00.000Z');
const fresh = '2026-11-21T11:55:00.000Z';
const ok = { typed: 'Bora farm', phrase: 'Bora farm', lastBackup: fresh, nowMs: now, unsent: 0 };

describe('wipeAllowed', () => {
  it('is open only with the right words, a backup from the last 15 minutes and nothing unsent', () => {
    expect(wipeAllowed(ok)).toEqual({ ok: true });
  });
  it('the typed words must match the farm name (spaces and capitals ignored), not just anything', () => {
    expect(wipeAllowed({ ...ok, typed: '  bora FARM ' })).toEqual({ ok: true });
    expect(wipeAllowed({ ...ok, typed: 'Bora' })).toEqual({ ok: false, why: 'phrase' });
    expect(wipeAllowed({ ...ok, typed: '' })).toEqual({ ok: false, why: 'phrase' });
    expect(wipeAllowed({ ...ok, phrase: '', typed: '' })).toEqual({ ok: false, why: 'phrase' });   // no name to match = never open
  });
  it('needs a backup made in the last 15 minutes: none, an old one, or an unreadable time all close it', () => {
    expect(wipeAllowed({ ...ok, lastBackup: undefined })).toEqual({ ok: false, why: 'backup' });
    expect(wipeAllowed({ ...ok, lastBackup: '2026-11-21T11:40:00.000Z' })).toEqual({ ok: false, why: 'backup' });
    expect(wipeAllowed({ ...ok, lastBackup: 'yesterday' })).toEqual({ ok: false, why: 'backup' });
    expect(wipeAllowed({ ...ok, lastBackup: '2026-11-21T12:00:01.000Z' })).toEqual({ ok: false, why: 'backup' });   // a backup «from the future» is not trusted
  });
  it('records that were not yet sent to the server close it (deleting them would lose them)', () => {
    expect(wipeAllowed({ ...ok, unsent: 2 })).toEqual({ ok: false, why: 'unsent' });
  });
});

describe('wipeThisPhone', () => {
  it('drops the whole database: after it every table is empty again, settings and the outbox included (the append-only guard stops row-by-row deletes on purpose)', async () => {
    const db = await newDb();
    await db.parcels.put({ id: 'p1', farm_id: TEST_FARM_ID, name: 'Κάτω Κάμπος' });
    await db.settings.put({ key: 'controller', value: { name: 'Bora' } });
    await db.outbox.put({ op_id: 'o1', farm_id: TEST_FARM_ID, table: 'parcels', row_id: 'p1', op: 'insert', row: {}, device_id: 'd', actor_id: 'a', at: '2026-11-21T11:00:00.000Z', status: 'pending' });
    await wipeThisPhone(db);
    const again = new AppDB(db.name); await again.open();                 // what the app finds after the reload
    for (const t of again.tables) expect(await t.count(), t.name).toBe(0);
    again.close();
  });
});
