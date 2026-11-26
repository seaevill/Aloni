import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../../config';
import { areaM2 } from '../../map/geo';
import { buildAnalysis } from '../../analyses/analysis';
import { putLocal } from '../../repo';
import type { AppDB, FarmTable, Row } from '../schema';
import { uuidv5 } from '../uuid';
import { SEASON_CUTS, SEASON_HARVESTS, SEASON_PLANTINGS, SEASON_SOIL, SEASON_WORK } from './data';
import { strip } from './geometry';
import { SEASON_PARCELS } from './parcels';
import { sprayRows } from './sprays';

// DEMO SEASON loader (queue item 32). An OPT-IN second Demo: the classic Demo is loaded first (crops, products with their label uses, weather), then everything that belongs to its five sample parcels is
// replaced by the season below. EVERY row carries the Demo farm id and an id derived from the Demo namespace: nothing can touch a real farm, loading twice gives the same ids, `removeDemo` removes it all.
// Days are offsets from `today`, so the season moves with the calendar. Nothing is rounded or defaulted: a crate count the app cannot read stays unreadable (shown «άγνωστο»).
const u = (kind: string, key: string): Promise<string> => uuidv5(`season:${kind}:${key}`, DEMO_NAMESPACE);
const crop = (slug: string): Promise<string> => uuidv5(`crops:${slug}`, DEMO_NAMESPACE);
export const dayAt = (today: string, offset: number): string => new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const REPLACED: readonly FarmTable[] = ['workers', 'parcels', 'plantings', 'jobs', 'job_plantings', 'job_spray', 'job_harvest', 'observations', 'soil_tests', 'water_tests', 'alerts', 'recommendations', 'stock_lots', 'stock_movements'];
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The strip outline of a planting and its typed area (the typed area is derived from the drawn one to one decimal and stays the authority). */
function outlineOf(p: (typeof SEASON_PLANTINGS)[number]) {
  const parcel = SEASON_PARCELS.find((x) => x.id === p.parcel)!;
  const ring = strip(parcel.boundary.coordinates[0]!, p.strip[0], p.strip[1], 0.04);
  const boundary = { type: 'Polygon' as const, coordinates: [ring] };
  if (areaM2(boundary) === undefined) throw new Error(`demo season: the outline of ${p.id} is not a valid polygon`);
  return { boundary, area_str: p.area };
}
export { outlineOf as plantingOutline };

export async function loadSeasonRows(today: string): Promise<Partial<Record<FarmTable, Row[]>>> {
  const at = (offset: number, time = '08:00:00') => `${dayAt(today, offset)}T${time}.000Z`;
  const out: Partial<Record<FarmTable, Row[]>> = { parcels: [], plantings: [], job_harvest: [], soil_tests: [] };
  const NOW = `${today}T06:00:00.000Z`;
  const parcelId = new Map<string, string>();
  for (const p of SEASON_PARCELS) {
    const id = await u('parcel', p.id); parcelId.set(p.id, id);
    out.parcels!.push({ id, farm_id: DEMO_FARM_ID, legacy_id: p.id, name: p.name, locality: p.locality, area_str: p.area_str, lat: p.lat, lng: p.lng, boundary: p.boundary, created_at: NOW, updated_at: NOW, deleted_at: null });
  }
  const plantingId = new Map<string, string>();
  for (const p of SEASON_PLANTINGS) {
    const id = await u('planting', p.id); plantingId.set(p.id, id);
    const o = outlineOf(p);
    out.plantings!.push({ id, farm_id: DEMO_FARM_ID, legacy_id: p.id, parcel_id: parcelId.get(p.parcel), crop_id: await crop(p.crop), area_str: o.area_str, sown_on: dayAt(today, p.sown), sown: dayAt(today, p.sown), status: p.status, boundary: o.boundary, created_at: NOW, updated_at: NOW, deleted_at: null });
  }
  for (const h of SEASON_HARVESTS) {
    out.job_harvest!.push({ id: await u('harvest', h.id), farm_id: DEMO_FARM_ID, planting_id: plantingId.get(h.planting), crates_str: h.crates, harvested_at: at(h.day, '07:30:00'), ...(h.dest ? { destination: h.dest } : {}), created_at: at(h.day, '09:00:00') });
  }
  for (const s of SEASON_SOIL) {
    const a = buildAnalysis({ parcelId: parcelId.get(s.parcel)!, sampledOn: dayAt(today, s.day), lab: '', ph: s.ph, ec: s.ec, ecUnit: 'dS/m', notes: s.notes, photoId: undefined }, DEMO_FARM_ID, NOW, await u('soil', s.parcel));
    if (a.ok) out.soil_tests!.push(a.row);
  }
  return out;
}

/** Phone-local Demo records (settings keyed by the Demo farm): cuts, fertilise/irrigate records, the fictional ΚΑΕΚ numbers. */
export async function seedSeasonLocal(db: AppDB, today: string): Promise<void> {
  const pid = async (p: string) => u('parcel', p);
  await putLocal(db, `cuts:${DEMO_FARM_ID}`, await Promise.all(SEASON_CUTS.map(async (c) => ({ id: await u('cut', c.id), parcel_id: await pid(c.parcel), day: dayAt(today, c.day), method: c.method }))));
  await putLocal(db, `field_work:${DEMO_FARM_ID}`, await Promise.all(SEASON_WORK.map(async (w) => ({ id: await u('work', w.id), parcel_id: await pid(w.parcel), kind: w.kind, day: dayAt(today, w.day), ...(w.n_form ? { n_form: w.n_form } : {}), ...(w.n_kg_per_str ? { n_kg_per_str: w.n_kg_per_str } : {}), ...(w.minutes ? { minutes: w.minutes } : {}), ...(w.m3 ? { m3: w.m3 } : {}) }))));
  const kaek: Record<string, string> = {};
  for (const p of SEASON_PARCELS) kaek[await pid(p.id)] = p.kaek;
  await putLocal(db, `kaek:${DEMO_FARM_ID}`, kaek);
}

/** Replaces what belongs to the classic Demo's five sample parcels with the season. Call AFTER the classic Demo was loaded. */
export async function applySeason(db: AppDB, today: string): Promise<void> {
  const rows = await loadSeasonRows(today);
  const sprays = await sprayRows(today, await db.products.where('farm_id').equals(DEMO_FARM_ID).toArray(), await db.label_uses.where('farm_id').equals(DEMO_FARM_ID).toArray(), rows.plantings ?? []);
  for (const [t, list] of Object.entries(sprays)) rows[t as FarmTable] = [...(rows[t as FarmTable] ?? []), ...list];
  const weatherDays = (await db.weather.where('farm_id').equals(DEMO_FARM_ID).toArray())[0]?.days ?? [];
  const weather = await Promise.all(SEASON_PARCELS.map(async (p) => ({ id: await u('weather', p.id), farm_id: DEMO_FARM_ID, parcel_id: await u('parcel', p.id), days: weatherDays })));   // ids first: nothing may be awaited from outside Dexie inside the transaction
  await db.transaction('rw', [...REPLACED.map((t) => db[t]), db.weather], async () => {
    for (const t of REPLACED) await db[t].where('farm_id').equals(DEMO_FARM_ID).delete();
    await db.weather.where('farm_id').equals(DEMO_FARM_ID).delete();
    for (const [t, list] of Object.entries(rows)) await db[t as FarmTable].bulkPut(list ?? []);
    await db.weather.bulkPut(weather);
  });
  await seedSeasonLocal(db, today);
}
export const seasonText = text;
