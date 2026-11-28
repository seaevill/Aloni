import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/config';
import { AppDB, type Row } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/db/schema';
import { guardAppendOnly, put, putMany, putSetting, refreshPending, syncMarks, pendingCount } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/repo';
import { applyPulled, dismissRejected } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/repo/sync-apply';
import { makeBackup, parseBackup, restoreBackup } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/repo/backup';
import { batches, push, pull, type Transport } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/sync/engine';
import { goLive } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/sync/golive';
import { buildCorrection, effectiveSprays } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/spray/spray';
import { seedDemoGuide } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/db/demo-guide';

const F = '11111111-1111-4111-8111-111111111111';
const newDb = async () => { const db = new AppDB('p-' + crypto.randomUUID()); guardAppendOnly(db); await db.open(); return db; };
const okServer = (over: Partial<Transport> = {}): Transport => ({ applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' as const })), pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), rpc: async () => ({ ok: true }), ...over });

describe('PROBE data integrity', () => {
  it('D1 a spray pulled from the server keeps chain_no, and a correction copies it (server apply_one refuses chain_no)', async () => {
    const db = await newDb();
    const spray: Row = { id: crypto.randomUUID(), farm_id: F, job_id: 'j1', product_id: 'p', dose_str: '1', dose_unit: 'ml/str', sprayed_at: '2026-11-20T08:00:00.000Z', applicator_id: 'w1', phi_days: '7', rei_hours: '24', chain_no: 41, server_seq: 9, hash: 'h', prev_hash: 'g', received_at: 'x', created_by: 'u', actor_id: 'worker-actor', device_id: 'worker-phone', created_at: '2026-11-20T08:01:00Z', flags: [] };
    await applyPulled(db, F, [{ table: 'job_spray', row: spray }]);
    const local = await db.job_spray.get(spray.id);
    console.log('D1 local pulled keys', Object.keys(local!).sort().join(','));
    const r = buildCorrection(local!, { dose: '2', doseUnit: 'ml/str', sprayedAt: '2026-11-20T08:00:00.000Z', applicatorId: 'w1', qty: '', water: '', note: '', reason: 'typo' }, { movements: [], lotBalance: undefined }, F, '2026-11-21T08:00:00Z', { spray: crypto.randomUUID(), moveIn: 'a', moveOut: 'b' });
    if (!r.ok) console.log('D1 errors', JSON.stringify(r.errors));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await putMany(db, [{ table: 'job_spray', row: r.spray, op: 'insert' }]);
    const op = (await db.outbox.toArray())[0];
    console.log('D1 correction op row has chain_no =', (op.row as Row).chain_no, ' actor_id =', (op.row as Row).actor_id, ' device_id =', (op.row as Row).device_id, ' envelope actor =', op.actor_id);
    expect((op.row as Row).chain_no).toBeUndefined(); // FAILS: server_owned list in 0012 apply_one includes chain_no -> rejected
  });

  it('D2 an amending row is stamped with the ORIGINAL author (actor/device), not the person correcting', async () => {
    const db = await newDb();
    const orig: Row = { id: crypto.randomUUID(), farm_id: F, job_id: 'j1', product_id: 'p', dose_str: '1', dose_unit: 'ml/str', sprayed_at: '2026-11-20T08:00:00.000Z', applicator_id: 'w1', phi_days: '7', rei_hours: '24', actor_id: 'worker-actor', device_id: 'worker-phone', created_at: '2026-11-20T08:01:00Z', flags: [] };
    await put(db, 'job_spray', orig, 'insert');
    const r = buildCorrection(orig, { dose: '2', doseUnit: 'ml/str', sprayedAt: orig.sprayed_at as string, applicatorId: 'w1', qty: '', water: '', note: '', reason: 'typo' }, { movements: [], lotBalance: undefined }, F, '2026-11-21T08:00:00Z', { spray: crypto.randomUUID(), moveIn: 'a', moveOut: 'b' });
    if (!r.ok) throw new Error('x');
    await putMany(db, [{ table: 'job_spray', row: r.spray, op: 'insert' }]);
    const mine = (await db.settings.get('actor_id'))?.value;
    const saved = await db.job_spray.get(r.spray.id);
    console.log('D2 corrector actor', mine, 'row actor', saved!.actor_id, 'row device', saved!.device_id);
    expect(saved!.actor_id).toBe(mine); // FAILS
  });

  it('D3 two offline corrections of the same spray fork the chain: both are «in force»', () => {
    const o: Row = { id: 'o', farm_id: F, job_id: 'j' };
    const a: Row = { id: 'a', farm_id: F, job_id: 'j', amends_id: 'o' }; const b: Row = { id: 'b', farm_id: F, job_id: 'j', amends_id: 'o' };
    const eff = effectiveSprays([o, a, b]).map((r) => r.id);
    console.log('D3 effective', eff);
    expect(eff).toHaveLength(1); // FAILS: ['a','b']
  });

  it('D4 a setting written while the Demo farm is active is queued under the Demo id and blocks go-live and the wipe', async () => {
    const db = await newDb();
    await putSetting(db, DEMO_FARM_ID, 'observations_reviewed', ['x']); // = markObservationSeen() with activeFarm = Demo
    console.log('D4 demo ops in outbox', await db.outbox.where('farm_id').equals(DEMO_FARM_ID).count(), 'pendingCount', await pendingCount(db));
    const g = await goLive(db, okServer(), F, undefined);
    console.log('D4 goLive', JSON.stringify(g));
    expect(await db.outbox.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0); // FAILS
  });

  it('D5 Demo-farm settings travel in a REAL backup and are re-queued for the server on an adopting restore', async () => {
    const a = await newDb();
    await seedDemoGuide(a);
    await putSetting(a, F, 'controller', { name: 'X' });
    const b = parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'r' }, 't')));
    const demoKeys = b.settings.map((s) => s.key).filter((k) => k.includes(DEMO_FARM_ID));
    console.log('D5 demo keys in real backup', demoKeys.join(' '));
    // adopting restore on a phone that played with the Demo (has demo settings, no real rows)
    const c = await newDb(); await seedDemoGuide(c);
    await restoreBackup(c, b, 'empty-farm-id');
    const queued = (await c.outbox.toArray()).filter((o) => o.table === 'settings' && String(o.row_id).includes(DEMO_FARM_ID)).map((o) => o.row_id);
    console.log('D5 demo settings queued for server under real farm', queued.join(' '));
    expect(demoKeys.length + queued.length).toBe(0); // FAILS
  });

  it('D6 a dismissed refusal makes the phone-only version show as «sent»', async () => {
    const db = await newDb();
    const p: Row = { id: 'p1', farm_id: F, name: 'A', area_str: '1' };
    await put(db, 'parcels', p, 'insert');
    await push(db, okServer(), F);
    await put(db, 'parcels', { ...p, name: 'B' }, 'update');
    await push(db, okServer({ applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'rejected' as const, code: 'x', reason: 'a change of a parcels needs a reason' })) }), F);
    const rej = (await db.outbox.where('status').equals('rejected').toArray())[0];
    await dismissRejected(db, rej.op_id);
    await refreshPending(db);
    console.log('D6 mark after dismiss', syncMarks.value.get('p1'), 'local name', (await db.parcels.get('p1'))!.name);
    // next pull: server still has «A» → the local B is silently replaced
    await pull(db, okServer({ pull: async () => ({ rows: [{ table: 'parcels', x: '1', seq: 1, row: { ...p } }], more: false, reset: false, cursor: { x: '1' } }) }), F);
    console.log('D6 local name after pull', (await db.parcels.get('p1'))!.name);
    expect(syncMarks.value.get('p1')).not.toBe('sent'); // FAILS
  });

  it('D7 clock moved back: a child written later sorts before its parent (server FK → permanent refusal)', async () => {
    const db = await newDb();
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-12-05T10:00:00Z'); // phone clock a week fast
    await put(db, 'parcels', { id: 'par', farm_id: F, name: 'x' }, 'insert');
    Date.now = () => Date.parse('2026-11-28T10:00:00Z'); // clock fixed, app reloaded (lastAt is in memory only; same module here keeps lastAt -> simulate reload)
    Date.now = realNow;
    const ops = await db.outbox.toArray();
    // simulate the reloaded app writing a planting at the corrected time
    ops.push({ ...ops[0], op_id: 'child', table: 'plantings', row_id: 'pl', at: '2026-11-28T10:00:00.000Z' });
    const order = batches(ops)[0].map((o) => o.table);
    console.log('D7 order', order);
    expect(order).toEqual(['parcels', 'plantings']); // FAILS
  });

  it('D8 restore onto a NEW phone queues every mutable record as «update» (server: «nothing to update» if absent, or overwrites newer server data)', async () => {
    const a = await newDb();
    await put(a, 'parcels', { id: 'p', farm_id: F, name: 'old', updated_at: '2026-11-01T00:00:00Z' }, 'insert');
    await put(a, 'workers', { id: 'w', farm_id: F, name: 'W' }, 'insert');
    const b = parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'r' }, 't')));
    const c = await newDb();
    await restoreBackup(c, b, 'fresh');
    const ops = (await c.outbox.toArray()).filter((o) => o.table !== 'settings').map((o) => o.table + ':' + o.op);
    console.log('D8 ops after restore', ops);
    expect(ops.every((x) => x.endsWith(':insert'))).toBe(true); // FAILS
  });

  it('D9 append-only guard: bulkPut / put / clear on real spray rows', async () => {
    const db = await newDb();
    const s: Row = { id: 's1', farm_id: F, dose_str: '1' };
    await db.job_spray.add(s);
    const tries: Record<string, string> = {};
    for (const [n, f] of Object.entries({ put: () => db.job_spray.put({ ...s, dose_str: '9' }), bulkPut: () => db.job_spray.bulkPut([{ ...s, dose_str: '8' }]), update: () => db.job_spray.update('s1', { dose_str: '7' }), del: () => db.job_spray.delete('s1'), clear: () => db.job_spray.clear() })) {
      try { await f(); tries[n] = 'ALLOWED dose=' + (await db.job_spray.get('s1'))?.dose_str; } catch (e) { tries[n] = 'refused'; }
    }
    console.log('D9', JSON.stringify(tries));
    expect(Object.values(tries).every((v) => v === 'refused')).toBe(true);
  });

  it('D10 a pull reset never removes rows the server no longer shows this worker (job reassigned stays «mine»)', async () => {
    const db = await newDb();
    const job: Row = { id: 'j', farm_id: F, kind: 'spray', status: 'planned', worker_id: 'me' };
    await pull(db, okServer({ pull: async () => ({ rows: [{ table: 'jobs', x: '1', seq: 1, row: job }], more: false, reset: false, cursor: { x: '1', v: 'h1' } }) }), F);
    await pull(db, okServer({ pull: async () => ({ rows: [], more: false, reset: true, cursor: { x: '2', v: 'h2' } }) }), F);
    console.log('D10 job still local after reset', !!(await db.jobs.get('j')));
    expect(await db.jobs.get('j')).toBeUndefined(); // FAILS
  });

  it('D11 two devices edit the same parcel: whole-row LWW on the server loses the first edit (fake server mirroring apply_one)', async () => {
    const server = new Map<string, Row>();
    const tr = okServer({ applyOps: async (ops) => ops.map((o) => { const r = o.row as Row; server.set(r.id, { ...r }); return { op_id: String(o.op_id), status: 'applied' as const }; }), pull: async () => ({ rows: [...server.values()].map((row, i) => ({ table: 'parcels', x: String(i), seq: i, row })), more: false, reset: false, cursor: null }) });
    const A = await newDb(); const B = await newDb();
    const base: Row = { id: 'p', farm_id: F, name: 'Κάμπος', area_str: '1' };
    await put(A, 'parcels', base, 'insert'); await push(A, tr, F); await pull(B, tr, F);
    await put(A, 'parcels', { ...base, name: 'Κάμπος Β' }, 'update');           // A offline: rename
    await put(B, 'parcels', { ...(await B.parcels.get('p'))!, area_str: '2' }, 'update');  // B offline: area
    await push(A, tr, F); await push(B, tr, F); await pull(A, tr, F);
    console.log('D11 server', JSON.stringify({ name: server.get('p')!.name, area: server.get('p')!.area_str }), 'A local', (await A.parcels.get('p'))!.name);
    expect(server.get('p')!.name).toBe('Κάμπος Β'); // FAILS: rename silently lost, no conflict shown
  });

  it('D12 acked ops are never pruned (each write keeps a full row copy forever)', async () => {
    const db = await newDb();
    for (let i = 0; i < 20; i++) await put(db, 'parcels', { id: 'p', farm_id: F, name: 'n' + i }, i ? 'update' : 'insert');
    await push(db, okServer(), F);
    console.log('D12 outbox rows after all acked', await db.outbox.count());
    expect(await db.outbox.count()).toBeLessThan(20);
  });
});
