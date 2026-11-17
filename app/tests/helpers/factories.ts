import { AppDB, type Row } from '../../src/db/schema';

// Test data factories on fake-indexeddb (import 'fake-indexeddb/auto' in the test). Rows default to a fictional REAL farm.
export async function newDb(): Promise<AppDB> {
  const db = new AppDB(`test-${crypto.randomUUID()}`);
  await db.open();
  return db;
}

export const TEST_FARM_ID = '11111111-1111-4111-8111-111111111111'; // a fictional real farm

export async function putParcel(db: AppDB, over: Partial<Row> = {}, farmId = TEST_FARM_ID): Promise<Row> {
  const row: Row = { id: crypto.randomUUID(), farm_id: farmId, name: 'Test parcel', area_str: 0.6, ...over };
  await db.parcels.put(row);
  return row;
}
