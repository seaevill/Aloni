import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { FARM_TABLES, type Row } from '../../src/db/schema';
import { buildHarvest } from '../../src/spray/harvest';
import { buildSpray } from '../../src/spray/spray';
import { buildObservation } from '../../src/worker/jobs';
import { buildWorker } from '../../src/workers/worker';
import { putMany } from '../../src/repo';
import { makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

const demo = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
const now = '2026-11-20T10:00:00.000Z';

async function realRecords() {
  const db = await newDb();
  const w = buildWorker('Γιώργος', F, now, 'w1'); if (!w.ok) throw new Error('setup');
  const planting: Row = { id: 'pl1', farm_id: F, crop_id: 'crop', parcel_id: 'p1', area_str: '0.5' };
  const s = buildSpray({ plantingIds: ['pl1'], productId: 'prod', applicatorId: 'w1', sprayedAt: '2026-11-20T08:00:00Z', dose: '0,025', doseUnit: 'ml/str', lotKey: undefined, qty: '', water: '', note: '' },
    { label: undefined, plantings: [planting], lot: undefined, lotBalance: undefined, today: '2026-11-20' }, F, now, { job: 'job1', spray: 'sp1', movement: 'mv1', plantingLinks: ['jp1'] });
  if (!s.ok) throw new Error('setup');
  const h = buildHarvest({ plantingId: 'pl2', crates: '12', harvestedAt: '2026-11-20T09:00:00Z', note: '' }, [], [], F, now, 'h1'); if (!h.ok) throw new Error('setup');
  const o = buildObservation('p1', 'pest', 'aphids', w.row, F, now, 'o1'); if (!o) throw new Error('setup');
  await putMany(db, [
    { table: 'workers', row: w.row, op: 'insert' }, { table: 'jobs', row: s.job, op: 'insert' }, { table: 'job_plantings', row: s.jobPlantings[0], op: 'insert' },
    { table: 'job_spray', row: s.spray, op: 'insert' }, { table: 'job_harvest', row: h.row, op: 'insert' }, { table: 'observations', row: o, op: 'insert' },
  ]);
  return db;
}

describe('backup and restore cover the new records, and never the demo', () => {
  it('worker roster, jobs, sprays, harvests and observations survive backup → restore exactly, once, with their original ids', async () => {
    const a = await realRecords();
    await importDemo(a, demo); // a demo farm on the same phone
    const backup = parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'T' }, 'test')));
    for (const t of ['workers', 'jobs', 'job_plantings', 'job_spray', 'job_harvest', 'observations'] as const) expect(backup.tables[t], t).toHaveLength(1);
    for (const t of FARM_TABLES) for (const r of backup.tables[t]) expect(r.farm_id, t).toBe(F); // not one demo row travels
    expect(JSON.stringify(backup)).not.toContain(DEMO_FARM_ID);

    const b = await newDb();
    const first = await restoreBackup(b, backup, 'empty');
    expect(first.skipped).toEqual([]);
    for (const t of ['workers', 'jobs', 'job_plantings', 'job_spray', 'job_harvest', 'observations'] as const) expect(await b[t].toArray(), t).toEqual(await a[t].where('farm_id').equals(F).toArray());
    const queued = await b.outbox.count();
    const again = await restoreBackup(b, backup, F); // idempotent
    expect(again).toMatchObject({ rows: 0, skipped: [] });
    expect(await b.outbox.count()).toBe(queued);
    expect((await b.job_spray.get('sp1'))?.actor_id).toBe((await a.job_spray.get('sp1'))?.actor_id); // original identities kept
  });
  it('a record that differs on the phone (a spray, a harvest) is skipped and listed, never changed', async () => {
    const a = await realRecords();
    const backup = parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'T' }, 'test')));
    const b = await newDb();
    await restoreBackup(b, backup, 'empty');
    const other = await newDb();
    await restoreBackup(other, backup, 'empty');
    await other.job_harvest.clear(); await other.job_spray.clear();
    await putMany(other, [{ table: 'job_harvest', row: { id: 'h1', farm_id: F, planting_id: 'pl2', crates_str: '99', harvested_at: '2026-11-21T08:00:00Z', created_at: now }, op: 'insert' }]);
    const r = await restoreBackup(other, backup, F);
    expect(r.skipped.map((x) => x.table)).toEqual(['job_harvest']);
    expect((await other.job_harvest.get('h1'))?.crates_str).toBe('99');
  });
  it('the demo farm alone gives an empty backup; loading and removing the demo leaves the real records alone', async () => {
    const a = await realRecords();
    await importDemo(a, demo);
    const demoOnly = await makeBackup(a, { id: DEMO_FARM_ID, name: 'demo' }, 'test');
    expect(() => parseBackup(JSON.stringify(demoOnly))).toThrow(); // refused as a demo backup
    const before = await a.job_spray.where('farm_id').equals(F).toArray();
    const { removeDemo } = await import('../../src/db/import-demo');
    await removeDemo(a);
    expect(await a.job_spray.where('farm_id').equals(F).toArray()).toEqual(before);
    expect(await a.job_spray.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0);
    expect(await a.outbox.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0);
  });
});
