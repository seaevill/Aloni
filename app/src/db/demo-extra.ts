import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../config';
import { buildLabelUse, withSignOff, type LabelUseInput } from '../labels/label-use';
import { buildSpray } from '../spray/spray';
import { buildReceipt } from '../stock/stock';
import { buildAnalysis } from '../analyses/analysis';
import type { FarmTable, Row } from './schema';
import { uuidv5 } from './uuid';

// FICTIONAL sample records for the Demo farm ONLY, built from the prototype's own spray / harvest / soil / stock data with the SAME builders the real
// screens use (so the demo shows exactly what the real app would). Every row carries the Demo farm id: nothing here can mix with Bora's real data.
// The label values come from the prototype's `registered[]`; where the prototype has no value (maximum applications) one in three uses is left empty
// (shows «ΑΠΟΚΛΕΙΣΜΕΝΟ»), one in three is complete but unsigned, one in three carries a FICTIONAL agronomist's signature. This never touches a real farm.

type Proto = Record<string, unknown>;
const NOW = '2026-11-17T08:00:00.000Z';
const u = (name: string) => uuidv5(name, DEMO_NAMESPACE);
const field = (text: string) => ({ notOnLabel: false, text });
export const DEMO_SIGNER = 'Γεωπόνος επίδειξης (φανταστικός)';

export async function demoExtraRows(data: Record<string, unknown>, idOf: (table: FarmTable, legacy: string) => string): Promise<Partial<Record<FarmTable, Row[]>>> {
  const arr = (k: string) => (data[k] as Proto[] | undefined) ?? [];
  const out: Partial<Record<FarmTable, Row[]>> = { workers: [], label_uses: [], stock_lots: [], stock_movements: [], jobs: [], job_plantings: [], job_spray: [], job_harvest: [], soil_tests: [], observations: [] };
  const push = (t: FarmTable, r: Row) => (out[t] as Row[]).push(r);

  const workerIds = new Map<string, string>();
  for (const name of ['Bora', 'Γιώργος', 'Ahmet']) {
    const id = await u(`worker:${name}`);
    workerIds.set(name, id);
    push('workers', { id, farm_id: DEMO_FARM_ID, name, created_at: NOW, updated_at: NOW, deleted_at: null });
  }

  // label uses (from `registered[]`): signed / unsigned / incomplete in turn
  const labels = new Map<string, Row>();
  let n = 0;
  for (const p of arr('products')) {
    for (const reg of (p.registered as Proto[] | undefined) ?? []) {
      const pid = idOf('products', String(p.id)); const cid = idOf('crops', String(reg.crop_id));
      const input: LabelUseInput = {
        productId: pid, cropId: cid, target: '', source: 'ΕΠΙΔΕΙΞΗ', kind: 'single', unit: p.unit === 'kg' ? 'kg/str' : 'l/str',
        doseMin: field(String(reg.dose_per_str)), doseMax: field(''), phi: field(String(reg.phi_days)), rei: field(String(reg.rei_h)), maxApps: field(n % 3 === 2 ? '' : '3'),
      };
      const built = buildLabelUse(input, DEMO_FARM_ID, NOW, await u(`label_use:${p.id}:${reg.crop_id}`));
      if (!built.ok) continue;
      let row = built.row;
      if (n % 3 === 0) row = withSignOff(row, DEMO_SIGNER, '2026-11-01', NOW) ?? row;
      labels.set(`${p.id}|${reg.crop_id}`, row);
      push('label_uses', row);
      n += 1;
    }
  }

  // stock: one lot per product that has a quantity and an expiry; one product is taken out beyond its stock (negative balance on screen)
  const lots = new Map<string, Row>();
  for (const p of arr('products')) {
    if (typeof p.expiry !== 'string' || typeof p.qty !== 'number') continue;
    const lotId = await u(`lot:${p.id}`);
    const r = buildReceipt({ productId: idOf('products', String(p.id)), batch: `${String(p.id)}-A`, expiry: p.expiry, qty: String(p.qty), photoId: undefined }, DEMO_FARM_ID, NOW, { lot: lotId, movement: await u(`movement:${p.id}`) });
    if (!r.ok) continue;
    lots.set(String(p.id), r.lot);
    push('stock_lots', r.lot); push('stock_movements', r.movement);
    if (p.id === 'PR10') push('stock_movements', { id: await u('movement:PR10:out'), farm_id: DEMO_FARM_ID, lot_key: lotId, product_id: r.lot.product_id, direction: 'out', qty_str: '0.5', reason: 'spray', created_at: NOW });
  }

  // sprays from the prototype's spray jobs, through the real builder
  for (const j of arr('jobs').filter((x) => x.kind === 'spray')) {
    const planting = arr('plantings').find((x) => x.id === j.planting_id);
    const label = labels.get(`${j.product_id}|${planting?.crop_id}`);
    if (!planting) continue;
    const unit = label?.dose_unit === 'kg/str' || label?.dose_unit === 'l/str' ? label.dose_unit : (arr('products').find((x) => x.id === j.product_id)?.unit === 'kg' ? 'kg/str' : 'l/str');
    const plantingRow: Row = { id: idOf('plantings', String(planting.id)), farm_id: DEMO_FARM_ID, crop_id: idOf('crops', String(planting.crop_id)), area_str: planting.area_str };
    const ids = { job: await u(`spray-job:${j.id}`), spray: await u(`spray:${j.id}`), movement: await u(`spray-mv:${j.id}`), plantingLinks: [await u(`spray-jp:${j.id}`)] };
    const r = buildSpray({ plantingIds: [plantingRow.id], productId: idOf('products', String(j.product_id)), applicatorId: workerIds.get(String(j.by)) ?? workerIds.get('Bora') as string, sprayedAt: `${String(j.date)}T07:00:00Z`, dose: String(j.dose), doseUnit: unit as 'kg/str' | 'l/str', lotKey: undefined, qty: '', water: '', note: '' },
      { label, plantings: [plantingRow], lot: undefined, lotBalance: undefined, today: '2026-11-17' }, DEMO_FARM_ID, NOW, ids);
    if (!r.ok) continue;
    push('jobs', r.job); r.jobPlantings.forEach((x) => push('job_plantings', x)); push('job_spray', r.spray);
  }

  // harvests: the prototype's harvest jobs («38 crates» in the note)
  for (const j of arr('jobs').filter((x) => x.kind === 'harvest')) {
    const crates = /(\d+)\s*crates/.exec(String(j.notes))?.[1];
    if (!crates) continue;
    push('job_harvest', { id: await u(`harvest:${j.id}`), farm_id: DEMO_FARM_ID, planting_id: idOf('plantings', String(j.planting_id)), crates_str: crates, harvested_at: `${String(j.date)}T10:00:00Z`, created_at: NOW });
  }

  // soil analyses from the parcels' own soil data (EC in dS/m as the prototype gives it)
  for (const p of arr('parcels')) {
    const s = p.soil as Proto | undefined;
    if (!s) continue;
    const a = buildAnalysis({ parcelId: idOf('parcels', String(p.id)), sampledOn: String(s.date), lab: '', ph: String(s.pH), ec: String(s.EC_dS_m), ecUnit: 'dS/m', notes: `OM ${String(s.OM_pct)} % · N ${String(s.N_ppm)} · P ${String(s.P_ppm)} · K ${String(s.K_ppm)} · CaCO3 ${String(s.CaCO3_pct)} %`, photoId: undefined }, DEMO_FARM_ID, NOW, await u(`soil:${p.id}`));
    if (a.ok) push('soil_tests', a.row);
  }
  // open spray jobs for the worker view: the first signed label uses (they carry a known waiting period) on a planting of that crop, one worker each in turn
  let k = 0;
  for (const [key, label] of labels) {
    if (!label.sign_off || k >= 3) continue;
    const [pid, crop] = key.split('|');
    const planting = arr('plantings').find((x) => x.crop_id === crop);
    if (!planting) continue;
    const worker = ['Γιώργος', 'Ahmet', 'Γιώργος'][k];
    const jobId = await u(`planned-job:${key}`);
    push('jobs', { id: jobId, farm_id: DEMO_FARM_ID, kind: 'spray', status: 'planned', product_id: idOf('products', pid), label_use_id: label.id, worker_id: workerIds.get(worker), planned_for: '2026-11-18', dose_str: label.dose_min, dose_unit: label.dose_unit, created_at: NOW, updated_at: NOW, deleted_at: null });
    push('job_plantings', { id: await u(`planned-jp:${key}`), farm_id: DEMO_FARM_ID, job_id: jobId, planting_id: idOf('plantings', String(planting.id)), area_str_treated: planting.area_str, created_at: NOW });
    k += 1;
  }
  return out;
}
