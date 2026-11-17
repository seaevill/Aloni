import { AppDB, type Row } from '../../src/db/schema';

// Test data factories on fake-indexeddb (import 'fake-indexeddb/auto' in the test). Rows default to the REAL farm ('main').
export async function newDb(): Promise<AppDB> {
  const db = new AppDB(`test-${crypto.randomUUID()}`);
  await db.open();
  return db;
}

export async function putParcel(db: AppDB, over: Partial<Row> = {}, farmId = 'main'): Promise<Row> {
  const id = crypto.randomUUID();
  const row: Row = { uid: `${farmId}:${id}`, farmId, id, name: 'Test parcel', area_str: 0.6, ...over };
  await db.parcels.put(row);
  return row;
}
