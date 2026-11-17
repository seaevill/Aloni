// THE write path. Every record the user creates or changes goes through put(): the row and its outbox entry are written in ONE
// transaction (both or neither). The Demo farm never gets an outbox entry. Append-only tables accept inserts only: a correction
// is a NEW row that points at the old one (`amends_id`). Nothing outside src/repo and src/db may write to Dexie (ESLint W01).
import { signal } from '@preact/signals';
import { DEMO_FARM_ID } from '../config';
import type { AppDB, Row } from '../db/schema';

/** Records that are never changed or deleted once written (spray, harvest, stock movements, ...). */
export const APPEND_ONLY = ['job_spray', 'job_harvest', 'job_fertilise', 'job_irrigate', 'job_sow', 'stock_movements', 'observations', 'media'] as const;
const isAppendOnly = (table: string) => (APPEND_ONLY as readonly string[]).includes(table);

/** Safety net behind put(): even a direct Dexie write to an append-only table throws. */
export function guardAppendOnly(db: AppDB): void {
  for (const table of db.tables) {
    if (!isAppendOnly(table.name)) continue;
    const refuse = () => { throw new Error(`${table.name} is append-only: insert an amending row instead`); };
    table.hook('updating', refuse);
    table.hook('deleting', refuse);
  }
}

/** Which phone (device_id) and which person (actor_id) wrote a record: two separate ids, created once on this phone. */
async function localId(db: AppDB, key: 'device_id' | 'actor_id'): Promise<string> {
  const row = await db.settings.get(key);
  if (row) return String(row.value);
  const value = crypto.randomUUID();
  await db.settings.put({ key, value });
  return value;
}
export const deviceId = (db: AppDB) => localId(db, 'device_id');
export const actorId = (db: AppDB) => localId(db, 'actor_id');

export type Op = 'insert' | 'update';

async function enqueue(db: AppDB, farmId: string, table: string, rowId: string, op: Op, row: unknown): Promise<void> {
  await db.outbox.add({
    op_id: crypto.randomUUID(), farm_id: farmId, table, row_id: rowId, op, row,
    device_id: await deviceId(db), actor_id: await actorId(db), at: new Date().toISOString(), status: 'pending',
  });
}

export async function put(db: AppDB, table: string, row: Row, op: Op = 'update'): Promise<void> {
  if (isAppendOnly(table) && op !== 'insert') throw new Error(`${table} is append-only: insert an amending row instead`);
  await db.transaction('rw', [db.table(table), db.outbox, db.settings], async () => {
    await (op === 'insert' ? db.table(table).add(row) : db.table(table).put(row));
    if (row.farm_id !== DEMO_FARM_ID) await enqueue(db, row.farm_id, table, row.id, op, row);
  });
  await refreshPending(db);
}

/** Owner settings (e.g. the data controller details): same rule, one transaction, queued for sync. */
export async function putSetting(db: AppDB, farmId: string, key: string, value: unknown): Promise<void> {
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    await db.settings.put({ key, value });
    await enqueue(db, farmId, 'settings', key, 'update', { key, value });
  });
  await refreshPending(db);
}

export const pendingCount = (db: AppDB): Promise<number> => db.outbox.where('status').equals('pending').count();

/** What the screens show: how many records have not reached the server yet, and which ones (the unsynced dot). */
export const pendingOps = signal(0);
export const unsyncedIds = signal<ReadonlySet<string>>(new Set());
export async function refreshPending(db: AppDB): Promise<void> {
  const rows = await db.outbox.where('status').equals('pending').toArray();
  pendingOps.value = rows.length;
  unsyncedIds.value = new Set(rows.map((r) => r.row_id));
}
