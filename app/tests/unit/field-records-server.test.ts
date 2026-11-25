import 'fake-indexeddb/auto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { addCut, loadCuts, removeCut } from '../../src/cuts/cuts';
import { addWork, loadWork, removeWork } from '../../src/fieldwork/fieldwork';
import { cutRow, workRow } from '../../src/fieldwork/server-rows';
import { serverFieldOf } from '../../src/owner-records/mode';
import { putLocal } from '../../src/repo';
import { READINESS_KEY } from '../../src/settings/readiness';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const NOW = '2026-11-25T10:00:00.000Z';
const PENDING = new URL('../../../supabase/tests/phone-columns.pending-0042.json', import.meta.url);

describe('SQL 0042 field records (owner only), dormant until the readiness card names ≥ 0042', () => {
  it('server mode only from a confirmed migration ≥ 0042', () => {
    expect([undefined, { migration: '0041' }, { migration: '0042' }].map((c) => serverFieldOf(c as never))).toEqual([false, false, true]);
  });
  it('rows the server would refuse are refused here first', () => {
    expect(() => cutRow({ parcel_id: 'p', day: '1999-12-31', method: 'hand' }, F, 'i', NOW)).toThrow('bad day');
    expect(() => cutRow({ parcel_id: 'p', day: '2026-11-01', method: 'laser' }, F, 'i', NOW)).toThrow('bad method');
    expect(() => workRow({ parcel_id: 'p', kind: 'fertilise', day: '2026-11-01' }, F, 'i', NOW)).toThrow('mandatory');
    expect(() => workRow({ parcel_id: 'p', kind: 'fertilise', day: '2026-11-01', n_form: 'urea', n_kg_per_str: '0' }, F, 'i', NOW)).toThrow('bad quantity');
    expect(() => workRow({ parcel_id: 'p', kind: 'irrigate', day: '2026-11-01', minutes: '1e3' }, F, 'i', NOW)).toThrow('bad minutes');
    expect(() => workRow({ parcel_id: 'p', kind: 'irrigate', day: '2026-11-01' }, F, 'i', NOW)).toThrow('minutes or m3');
    const ok = workRow({ parcel_id: 'p', kind: 'irrigate', day: '2026-11-01', minutes: '90', m3: '12,5' }, F, 'i', NOW, { rain: 0 });
    expect(ok).toMatchObject({ minutes_str: '90', m3_str: '12,5', weather: { rain: 0 } });
    expect('n_form' in ok).toBe(false);
  });
  it('before the confirmation: unchanged (phone settings, no server rows, no queue)', async () => {
    const db = await newDb();
    await addCut(db, F, { parcel_id: 'p', day: '2026-11-20', method: 'shredder' }, 'c1');
    await addWork(db, F, { parcel_id: 'p', kind: 'irrigate', day: '2026-11-20', minutes: '60' }, 'w1', '2026-11-25');
    expect((await loadCuts(db, F)).length + (await loadWork(db, F)).length).toBe(2);
    expect(await db.field_cuts.count() + await db.field_work.count() + await db.outbox.count()).toBe(0);
  });
  it('after the confirmation: server rows + queued ops, removal is a tombstone, the local copy moves up once', async () => {
    const db = await newDb();
    await addCut(db, F, { parcel_id: 'p', day: '2026-11-20', method: 'shredder' }, 'old-cut');          // typed before the confirmation
    await addWork(db, F, { parcel_id: 'p', kind: 'fertilise', day: '2026-11-20', n_form: 'nitrate' }, 'old-work', '2026-11-25');
    await putLocal(db, READINESS_KEY, { migration: '0042' });
    expect((await loadCuts(db, F)).map((c) => c.id)).toEqual(['old-cut']);
    expect((await loadWork(db, F)).map((w) => w.id)).toEqual(['old-work']);
    expect(await db.settings.get(`cuts:${F}`)).toBeUndefined();
    await addCut(db, F, { parcel_id: 'p', day: '2026-11-21', method: 'hand' }, 'new-cut');
    expect(await db.field_cuts.count()).toBe(2);
    expect((await db.outbox.toArray()).map((o) => o.table).sort()).toEqual(['field_cuts', 'field_cuts', 'field_work']);
    await removeCut(db, F, 'new-cut'); await removeWork(db, F, 'old-work');
    expect(await db.field_cuts.get('new-cut')).toMatchObject({ deleted_at: expect.any(String) });
    expect((await loadCuts(db, F)).map((c) => c.id)).toEqual(['old-cut']);
    expect(await loadWork(db, F)).toEqual([]);
    expect(await db.field_work.count()).toBe(1);                                  // the record is still there, only tombstoned
    await loadCuts(db, F);
    expect(await db.field_cuts.count()).toBe(2);                                 // not moved again
  });
  it('the Demo farm never uses the server tables', async () => {
    const db = await newDb();
    await putLocal(db, READINESS_KEY, { migration: '0042' });
    await addCut(db, DEMO_FARM_ID, { parcel_id: 'p', day: '2026-11-20', method: 'hand' }, 'd1');
    expect(await db.field_cuts.count()).toBe(0);
    expect((await loadCuts(db, DEMO_FARM_ID)).length).toBe(1);
  });
  it('the phone fields match the pending contract file (folded into phone-columns.json when #500 is merged)', () => {
    const cut = Object.keys(cutRow({ parcel_id: 'p', day: '2026-11-01', method: 'hand' }, F, 'i', NOW)).sort();
    const work = Object.keys(workRow({ parcel_id: 'p', kind: 'fertilise', day: '2026-11-01', n_form: 'x', n_kg_per_str: '1,5' }, F, 'i', NOW, { rain: 1 })).concat(['minutes_str', 'm3_str']).sort();
    const out = { parcels_extra: ['kaek'], field_cuts: [...cut, 'actor_id', 'device_id'].sort(), field_work: [...work, 'actor_id', 'device_id'].sort() };
    if (process.env.UPDATE_CONTRACT) writeFileSync(PENDING, `${JSON.stringify(out, null, 1)}\n`);
    expect(JSON.parse(readFileSync(PENDING, 'utf8'))).toEqual(out);
  });
});
