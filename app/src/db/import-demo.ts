import { shiftWeather } from './demo-weather';
import { athensToday } from '../plantings/planting';
import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../config';
import { AppDB, FARM_TABLES, type FarmTable, type Row, type WeatherRow } from './schema';
import { demoExtraRows } from './demo-extra';
import { uuidv5 } from './uuid';

// Shape of reference/prototype/data.json (only what the importer relies on).
export interface PrototypeData {
  meta: Record<string, unknown>;
  weather: { by_parcel: Record<string, unknown[]> };
  [table: string]: unknown;
}

/** Which fields point at which table (prototype ids like "P1" become UUIDs, references are rewritten with them). */
const REFS: Record<FarmTable, Record<string, FarmTable>> = {
  parcels: {}, crops: {}, products: {}, label_uses: {}, stock_lots: {}, stock_movements: {}, soil_tests: {}, water_tests: {}, workers: {}, job_plantings: {}, job_spray: {}, job_harvest: {}, observations: {}, // the prototype's `registered[]` stays inside its product; the real farm's label uses are entered by hand
  plantings: { parcel_id: 'parcels', crop_id: 'crops' },
  jobs: { parcel_id: 'parcels', planting_id: 'plantings', product_id: 'products' },
  orders_weekly: { crop_id: 'crops' },
  alerts: { parcel_id: 'parcels', planting_id: 'plantings' },
  recommendations: { parcel_id: 'parcels', planting_id: 'plantings' },
};

/**
 * Misspelled Greek active-substance names in the prototype (`reference/` is read-only, so they are
 * corrected here at import time, in `name_el` only). Greek editor review, 2026-11-17.
 */
export const GREEK_NAME_FIXES: ReadonlyArray<readonly [string, string]> = [
  ['Κυκλοξυντίμ', 'Κυκλοξυδίμ'],
  ['Λενασίλ', 'Λενακίλ'],
  ['Διφαινοκοναζόλη', 'Διφενοκοναζόλη'],
  ['Μανδιπροπαμίδιο', 'Μανδιπροπαμίδη'],
];

/** A parcel's name in the prototype ends with its English name in brackets («Κάτω Κάμπος (Lower Plain)»): the app is Greek, so the Greek name stays (the original file is read-only, the cut is made here). */
const LATIN_TAIL = /\s*\([A-Za-z][^)]*\)\s*$/;

function fixGreekName(r: Record<string, unknown>): Record<string, unknown> {
  if (typeof r.name === 'string' && LATIN_TAIL.test(r.name)) r = { ...r, name: r.name.replace(LATIN_TAIL, '') };
  if (typeof r.name_el !== 'string') return r;
  let name = r.name_el;
  for (const [wrong, right] of GREEK_NAME_FIXES) name = name.replaceAll(wrong, right);
  return name === r.name_el ? r : { ...r, name_el: name };
}

/** orders_weekly rows have no id in the prototype; they are identified by their crop. */
const legacyId = (table: FarmTable, r: Record<string, unknown>, i: number): string =>
  typeof r.id === 'string' ? r.id : table === 'orders_weekly' && typeof r.crop_id === 'string' ? r.crop_id : String(i);

/**
 * Loads the prototype sample data into the Demo farm ONLY, with UUIDv5 ids (stable: importing twice gives the same ids).
 * Values are copied exactly: nothing is rounded, defaulted or invented (missing label data stays missing = unknown).
 * Re-running replaces the previous demo rows; the real farm is never touched.
 */
export async function importDemo(db: AppDB, data: PrototypeData): Promise<void> {
  const src = (t: FarmTable) => (data[t] as Array<Record<string, unknown>> | undefined) ?? [];
  const ids = {} as Record<FarmTable, Map<string, string>>;
  for (const t of FARM_TABLES) ids[t] = new Map(await Promise.all(src(t).map(async (r, i) => [legacyId(t, r, i), await uuidv5(`${t}:${legacyId(t, r, i)}`, DEMO_NAMESPACE)] as const)));
  const ref = (t: FarmTable, legacy: unknown): unknown => {
    if (typeof legacy !== 'string') return legacy; // null stays null
    const id = ids[t].get(legacy);
    if (!id) throw new Error(`demo data: ${t} "${legacy}" does not exist`);
    return id;
  };
  const tables = [db.farms, db.weather, ...FARM_TABLES.map((t) => db[t])];
  const weather: WeatherRow[] = await Promise.all(Object.entries(data.weather.by_parcel).map(async ([p, days]) =>
    ({ id: await uuidv5(`weather:${p}`, DEMO_NAMESPACE), farm_id: DEMO_FARM_ID, parcel_id: ref('parcels', p) as string, days: shiftWeather(days as Array<{ date?: unknown }>, typeof data.meta.today === 'string' ? data.meta.today : '', athensToday(new Date()) ?? '') })));   // fictional weather, moved so the prototype's today is the real today

  const extra = await demoExtraRows(data, (t, legacy) => ref(t, legacy) as string); // fictional spray / harvest / stock / label / soil records, built before the transaction (it may not await anything else)
  await db.transaction('rw', tables, async () => {
    await removeFarmRows(db, DEMO_FARM_ID);
    await db.farms.put({ id: DEMO_FARM_ID, name: String(data.meta.farm ?? 'Demo farm'), is_demo: true, meta: data.meta });
    for (const table of FARM_TABLES) {
      const rows: Row[] = src(table).map((r, i) => {
        const legacy = legacyId(table, r, i);
        const row: Row = { ...fixGreekName(r), id: ids[table].get(legacy) as string, legacy_id: legacy, farm_id: DEMO_FARM_ID };
        if (table === 'crops') row.slug = legacy;      // the prototype crop id IS the shared slug (spinach, rocket, …): the order and supply screens read it
        for (const [field, target] of Object.entries(REFS[table])) if (field in row) row[field] = ref(target, row[field]);
        if (table === 'plantings' && typeof row.sown === 'string' && row.sown_on === undefined) row.sown_on = row.sown; // the app reads `sown_on`; the prototype calls it `sown`
        if (table === 'products' && Array.isArray(row.registered)) {
          row.registered = (row.registered as Array<Record<string, unknown>>).map((u) => ({ ...u, crop_id: ref('crops', u.crop_id) }));
        }
        return row;
      });
      await db[table].bulkPut(rows);
    }
    for (const [table, rows] of Object.entries(extra)) await db[table as FarmTable].bulkPut(rows ?? []);
    await db.weather.bulkPut(weather);
  });
}

async function removeFarmRows(db: AppDB, farmId: string) {
  for (const table of FARM_TABLES) await db[table].where('farm_id').equals(farmId).delete();
  await db.weather.where('farm_id').equals(farmId).delete();
  await db.farms.delete(farmId);
}

export async function removeDemo(db: AppDB): Promise<void> {
  const tables = [db.farms, db.weather, ...FARM_TABLES.map((t) => db[t])];
  await db.transaction('rw', tables, () => removeFarmRows(db, DEMO_FARM_ID));
}
