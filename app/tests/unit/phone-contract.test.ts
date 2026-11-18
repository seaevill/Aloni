import 'fake-indexeddb/auto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildAnalysis } from '../../src/analyses/analysis';
import { CATALOG, cropRow } from '../../src/crops/catalog';
import { buildLabelUse, withSignOff } from '../../src/labels/label-use';
import { buildParcel } from '../../src/parcels/parcel';
import { buildPlanting } from '../../src/plantings/planting';
import { buildProduct } from '../../src/products/product';
import { putMany, putSetting } from '../../src/repo';
import { buildHarvest } from '../../src/spray/harvest';
import { buildSpray, buildWaitEntry } from '../../src/spray/spray';
import { buildAdjustment, buildReceipt } from '../../src/stock/stock';
import { buildObservation, completeSprayJob } from '../../src/worker/jobs';
import { buildWorker } from '../../src/workers/worker';
import type { Row } from '../../src/db/schema';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

// The phone ↔ server contract: every field a phone record carries must be a column of the server table apply_ops writes it to, otherwise apply_ops rejects the
// record («unknown column») and it sits in the outbox for ever. The rows come from the app's REAL builders (not the demo import, which has prototype-only
// fields and is never synced) and are read back from the outbox. The field list is committed as supabase/tests/phone-columns.json; supabase/tests/contract.sh
// compares it with the real tables in CI. After a deliberate change:  UPDATE_CONTRACT=1 npx vitest run tests/unit/phone-contract.test.ts
const FILE = new URL('../../../supabase/tests/phone-columns.json', import.meta.url);
const OPS = new URL('../../../supabase/tests/phone-ops.json', import.meta.url);
const now = '2026-11-10T10:00:00.000Z'; // in the past for ANY clock the SQL test runs on
const f = (text: string) => ({ notOnLabel: false, text });
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => { if (!r.ok) throw new Error(`setup ${JSON.stringify(r)}`); return r as Extract<T, { ok: true }>; };

describe('phone ↔ server contract', () => {
  it('the fields of every record the phone syncs match the committed contract file', async () => {
    const db = await newDb();
    const parcel = ok(buildParcel({ name: 'P', area: '0,5', topo: 'plain', pin: { lat: 37.99, lng: 23.35, accuracy_m: 12 } }, F, now, id(1))).row;
    const crop = await cropRow(CATALOG[0], F, now);
    const planting = ok(buildPlanting({ parcelId: id(1), cropId: String(crop.id), variety: 'v', lot: 'l', area: '0,25', sownOn: '2026-11-10', status: 'growing' }, F, now, id(2))).row;
    const product = ok(buildProduct({ name: 'Kocide', regNo: '1/2', type: 'fungicide', unit: 'kg', photoId: id(21) }, F, now, id(3))).row;
    const label = withSignOff(ok(buildLabelUse({ productId: id(3), cropId: String(crop.id), target: 't', source: 's', kind: 'single', unit: 'ml/str', doseMin: f('0,025'), doseMax: f(''), phi: f('7'), rei: f('24'), maxApps: f('3') }, F, now, id(5))).row, 'Agronomist', '2026-11-01', now) as Row;
    const odd = ok(buildLabelUse({ productId: id(3), cropId: String(crop.id), target: 'u', source: 's', kind: 'range', unit: 'ml/str', doseMin: f('0,1'), doseMax: f('0,2'), phi: { notOnLabel: true, text: '' }, rei: { notOnLabel: true, text: '' }, maxApps: { notOnLabel: true, text: '' } }, F, now, id(4))).row;
    const rec = ok(buildReceipt({ productId: id(3), batch: 'B', expiry: '2028-03-31', qty: '4,5', photoId: id(21) }, F, now, { lot: id(6), movement: id(7) }));
    const adj = ok(buildAdjustment({ lotKey: id(6), productId: id(3), direction: 'out', qty: '1', reason: 'x', amendsId: undefined }, F, now, id(8)));
    const soil = ok(buildAnalysis({ parcelId: id(1), sampledOn: '2026-11-10', lab: 'l', ph: '7,4', ec: '1,2', ecUnit: 'dS/m', notes: 'n', photoId: id(21) }, F, now, id(9))).row;
    const worker = ok(buildWorker('Γιώργος', F, now, id(10))).row;
    const spray = ok(buildSpray({ plantingIds: [id(2)], productId: id(3), applicatorId: id(10), sprayedAt: '2026-11-10T08:00:00Z', dose: '0,025', doseUnit: 'ml/str', lotKey: id(6), qty: '0,25', water: '1', note: 'n' },
      { label, plantings: [{ ...planting, crop_id: crop.id }], lot: rec.lot, lotBalance: '4.5', today: '2026-11-10' }, F, now, { job: id(11), spray: id(12), movement: id(13), plantingLinks: [id(14)] }));
    const wait = ok(buildWaitEntry({ ...spray.spray, label_state: 'unsigned', phi_days: undefined, phi_until: undefined, rei_hours: undefined, rei_until: undefined, phi_source: undefined }, '7', '24', now, id(15), 'label values entered'));
    const harvest = ok(buildHarvest({ plantingId: id(2), crates: '12', harvestedAt: '2026-11-10T09:00:00Z', note: 'n' }, [], [], F, now, id(16))).row;
    const obs = buildObservation(id(1), 'pest', 'aphids', worker, F, now, id(17)) as Row;
    const planned: Row = { id: id(18), farm_id: F, kind: 'spray', status: 'planned', product_id: id(3), label_use_id: id(5), worker_id: id(10), planned_for: '2026-11-11', dose_str: '0.025', dose_unit: 'ml/str', created_at: now, updated_at: now, deleted_at: null };
    const done = completeSprayJob(planned, label, [planting], worker, '2026-11-10T08:00:00Z', 'n', now, id(20));
    const skipped: Row = { ...planned, id: id(19), status: 'skipped', skip_reason: 'rain' };
    const photo: Row = { id: id(21), farm_id: F, sha256: 'a'.repeat(64), mime: 'image/jpeg', width: 4, height: 3, bytes: 1, created_at: now };
    const writes = [
      { table: 'media', row: photo, op: 'insert' }, { table: 'parcels', row: parcel, op: 'insert' }, { table: 'crops', row: crop, op: 'insert' }, { table: 'plantings', row: planting, op: 'insert' }, { table: 'products', row: product, op: 'insert' },
      { table: 'label_uses', row: label, op: 'insert' }, { table: 'label_uses', row: odd, op: 'insert' }, { table: 'stock_lots', row: rec.lot, op: 'insert' }, { table: 'stock_movements', row: rec.movement, op: 'insert' }, { table: 'stock_movements', row: adj.movement, op: 'insert' },
      { table: 'soil_tests', row: soil, op: 'insert' }, { table: 'workers', row: worker, op: 'insert' }, { table: 'jobs', row: spray.job, op: 'insert' }, { table: 'jobs', row: planned, op: 'insert' }, { table: 'jobs', row: skipped, op: 'insert' },
      { table: 'job_plantings', row: spray.jobPlantings[0], op: 'insert' }, { table: 'job_spray', row: spray.spray, op: 'insert' }, { table: 'job_spray', row: wait.row, op: 'insert' },
      { table: 'job_harvest', row: harvest, op: 'insert' }, { table: 'observations', row: obs, op: 'insert' },
      ...(done.ok ? [{ table: 'jobs', row: done.job, op: 'update' as const }, { table: 'job_spray', row: done.spray, op: 'insert' as const }] : []),
    ] as const;
    await putMany(db, [...writes]);
    await putSetting(db, F, 'controller', { name: 'T' });

    const out: Record<string, string[]> = {};
    const ops = await db.outbox.toArray();
    for (const o of ops) {
      const keys = new Set(out[o.table] ?? []);
      for (const [k, v] of Object.entries(o.row as object)) if (v !== undefined) keys.add(k); // an undefined value is not on the wire
      out[o.table] = [...keys].sort();
    }
    // the ops, in the order the phone wrote them, for the SQL end-to-end test (supabase/tests/phone.sql)
    const used = new Set<string>();
    const ordered = [...writes.map((w) => { const op = ops.find((o) => !used.has(o.op_id) && o.table === w.table && o.row_id === w.row.id && o.op === w.op); if (!op) throw new Error(`no op for ${w.table}`); used.add(op.op_id); return op; }), ops.find((o) => o.table === 'settings')!];
    const stable = (text: string) => ops.reduce((t, o) => t.split(o.device_id).join('phone-device').split(o.actor_id).join('phone-actor'), text); // random ids of this run → fixed text
    const opsFile = (JSON.parse(stable(JSON.stringify(ordered))) as Array<Record<string, unknown>>).map(({ status: _status, ...o }, i) => ({ ...o, op_id: id(1000 + i), at: now }));
    out.__op_fields = [...new Set(ops.flatMap((o) => Object.keys(o)))].sort();
    expect(Object.keys(out).sort()).toEqual(['__op_fields', 'crops', 'job_harvest', 'job_plantings', 'job_spray', 'jobs', 'label_uses', 'media', 'observations', 'parcels', 'plantings', 'products', 'settings', 'soil_tests', 'stock_lots', 'stock_movements', 'workers']);
    // the contract file has one line per table, so a change shows as one changed line
    if (process.env.UPDATE_CONTRACT) { writeFileSync(FILE, `{\n${Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`);  writeFileSync(OPS, `${JSON.stringify(opsFile)}\n`); }
    expect(opsFile).toEqual(JSON.parse(readFileSync(OPS, 'utf8')));
    expect(out).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });
});
