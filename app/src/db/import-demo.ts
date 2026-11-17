import { DEMO_FARM_ID } from '../config';
import { AppDB, FARM_TABLES, type FarmTable, type Row, type WeatherRow } from './schema';

// Shape of reference/prototype/data.json (only what the importer relies on).
export interface PrototypeData {
  meta: Record<string, unknown>;
  weather: { by_parcel: Record<string, unknown[]> };
  orders_weekly: Array<Record<string, unknown>>;
  [table: string]: unknown;
}

/** orders_weekly rows have no id in the prototype; derive a stable one from the crop. */
function rowId(table: FarmTable, r: Record<string, unknown>, i: number): string {
  if (typeof r.id === 'string') return r.id;
  if (table === 'orders_weekly' && typeof r.crop_id === 'string') return r.crop_id;
  return String(i);
}

/**
 * Loads the prototype sample data into the Demo farm ONLY. Values are copied exactly as they are:
 * nothing is rounded, defaulted or invented (missing label data stays missing = unknown).
 * Re-running replaces the previous demo rows; the real farm is never touched.
 */
export async function importDemo(db: AppDB, data: PrototypeData): Promise<void> {
  const farmId = DEMO_FARM_ID;
  const tables = [db.farms, db.weather, ...FARM_TABLES.map((t) => db[t])];
  await db.transaction('rw', tables, async () => {
    await removeFarmRows(db, farmId);
    await db.farms.put({ id: farmId, name: String(data.meta.farm ?? 'Demo farm'), isDemo: true, meta: data.meta });
    for (const table of FARM_TABLES) {
      const src = (data[table] as Array<Record<string, unknown>> | undefined) ?? [];
      const rows: Row[] = src.map((r, i) => {
        const id = rowId(table, r, i);
        return { ...r, id, farmId, uid: `${farmId}:${id}` };
      });
      await db[table].bulkPut(rows);
    }
    const wx: WeatherRow[] = Object.entries(data.weather.by_parcel).map(([parcelId, days]) => ({
      uid: `${farmId}:${parcelId}`, farmId, parcelId, days,
    }));
    await db.weather.bulkPut(wx);
  });
}

async function removeFarmRows(db: AppDB, farmId: string) {
  for (const table of FARM_TABLES) await db[table].where('farmId').equals(farmId).delete();
  await db.weather.where('farmId').equals(farmId).delete();
  await db.farms.delete(farmId);
}

export async function removeDemo(db: AppDB): Promise<void> {
  const tables = [db.farms, db.weather, ...FARM_TABLES.map((t) => db[t])];
  await db.transaction('rw', tables, () => removeFarmRows(db, DEMO_FARM_ID));
}
