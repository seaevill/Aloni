import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../../config';
import { buildReceipt } from '../../stock/stock';
import { buildSpray } from '../../spray/spray';
import type { Row } from '../schema';
import { uuidv5 } from '../uuid';
import { SEASON_SPRAYS, SEASON_WORKERS } from './data';

// Sprays and stock of the Demo season (queue item 32b). Everything goes through the real builders; the label record found in the Demo farm decides dose, unit, waiting periods and flags.
// A label that is missing, unsigned or incomplete stays exactly that: the spray carries its flag and the waiting period is UNKNOWN (never guessed, never a default).
const u = (kind: string, key: string): Promise<string> => uuidv5(`season:${kind}:${key}`, DEMO_NAMESPACE);
type Out = { workers: Row[]; jobs: Row[]; job_plantings: Row[]; job_spray: Row[]; stock_lots: Row[]; stock_movements: Row[] };

export async function sprayRows(today: string, products: readonly Row[], labels: readonly Row[], plantings: readonly Row[]): Promise<Out> {
  const NOW = `${today}T06:00:00.000Z`;
  const out: Out = { workers: [], jobs: [], job_plantings: [], job_spray: [], stock_lots: [], stock_movements: [] };
  const workerIds: string[] = [];
  for (const name of SEASON_WORKERS) { const id = await u('worker', name); workerIds.push(id); out.workers.push({ id, farm_id: DEMO_FARM_ID, name, created_at: NOW, updated_at: NOW, deleted_at: null }); }
  const lots = new Map<string, Row>();
  for (const p of products) {                          // one lot per product that has a quantity and an expiry (the product record's own values)
    if (typeof p.expiry !== 'string' || typeof p.qty !== 'number') continue;
    const r = buildReceipt({ productId: String(p.id), batch: `${String(p.legacy_id)}-A`, expiry: p.expiry, qty: String(p.qty), photoId: undefined }, DEMO_FARM_ID, NOW, { lot: await u('lot', String(p.legacy_id)), movement: await u('lotmv', String(p.legacy_id)) });
    if (!r.ok) continue;
    lots.set(String(p.legacy_id), r.lot); out.stock_lots.push(r.lot); out.stock_movements.push(r.movement);
  }
  for (const s of SEASON_SPRAYS) {
    const product = products.find((p) => p.legacy_id === s.product); const planting = plantings.find((p) => p.legacy_id === s.planting);
    if (!product || !planting) throw new Error(`demo season: ${s.id} needs ${s.product} and ${s.planting}`);
    const label = labels.find((l) => l.product_id === product.id && l.crop_id === planting.crop_id);
    const unit = label?.dose_unit === 'kg/str' || label?.dose_unit === 'l/str' ? label.dose_unit : product.unit === 'kg' ? 'kg/str' : 'l/str';
    const dose = typeof label?.dose_min === 'string' ? label.dose_min : '';
    if (dose === '') continue;                                   // no label dose, no spray record: nothing is typed in here
    const lot = s.lotQty ? lots.get(s.product) : undefined;
    const ids = { job: await u('spray-job', s.id), spray: await u('spray', s.id), movement: await u('spray-mv', s.id), plantingLinks: [await u('spray-jp', s.id)] };
    const r = buildSpray({ plantingIds: [String(planting.id)], productId: String(product.id), applicatorId: workerIds[s.worker]!, sprayedAt: `${new Date(Date.parse(`${today}T12:00:00Z`) + s.day * 86_400_000).toISOString().slice(0, 10)}T07:00:00Z`, dose, doseUnit: unit as 'kg/str' | 'l/str', lotKey: lot ? String(lot.lot_key) : undefined, qty: s.lotQty ?? '', water: '', note: '' },
      { label, plantings: [planting], lot, lotBalance: lot ? String(products.find((p) => p.legacy_id === s.product)?.qty) : undefined, today, historic: true, startOptional: true }, DEMO_FARM_ID, NOW, ids);
    if (!r.ok) throw new Error(`demo season: spray ${s.id} was refused by the builder`);
    out.jobs.push(r.job); r.jobPlantings.forEach((x) => out.job_plantings.push(x)); out.job_spray.push(r.spray); if (r.movement) out.stock_movements.push(r.movement);
  }
  return out;
}
