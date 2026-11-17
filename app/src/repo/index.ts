// THE write path. Every record the user creates or changes goes through put(): the row and its outbox entry are written in ONE
// transaction (both or neither). The Demo farm never gets an outbox entry. Append-only tables accept inserts only: a correction
// is a NEW row that points at the old one (`amends_id`). Nothing outside src/repo and src/db may write to Dexie (ESLint W01).
import { signal } from '@preact/signals';
import { DEMO_FARM_ID } from '../config';
import type { AppDB, Row } from '../db/schema';

/** Records that are never changed or deleted once written (spray, harvest, stock movements, ...). */
export const APPEND_ONLY = ['job_spray', 'job_harvest', 'job_fertilise', 'job_irrigate', 'job_sow', 'stock_lots', 'stock_movements', 'observations', 'media'] as const;
export const isAppendOnly = (table: string) => (APPEND_ONLY as readonly string[]).includes(table);

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

interface Ids { device_id: string; actor_id: string }
async function enqueue(db: AppDB, farmId: string, table: string, rowId: string, op: Op, row: unknown, ids: Ids): Promise<void> {
  await db.outbox.add({ op_id: crypto.randomUUID(), farm_id: farmId, table, row_id: rowId, op, row, ...ids, at: new Date().toISOString(), status: 'pending' });
}

/** Where a restored record came from: its own device_id/actor_id are kept; only a record that never had one gets the backup's phone (never the restoring phone). */
export interface Origin { device_id: string }

/**
 * Every record carries who wrote it (actor_id) and on which phone (device_id), stamped once when it is first written. A restore keeps the
 * original ids and queues the record under them; it never relabels it with the restoring phone's ids.
 */
export async function put(db: AppDB, table: string, row: Row, op: Op = 'update', origin?: Origin): Promise<void> {
  if (isAppendOnly(table) && op !== 'insert') throw new Error(`${table} is append-only: insert an amending row instead`);
  await db.transaction('rw', [db.table(table), db.outbox, db.settings], async () => {
    const mine: Ids = { device_id: await deviceId(db), actor_id: await actorId(db) };
    const ids: Ids = origin
      ? { device_id: typeof row.device_id === 'string' ? row.device_id : origin.device_id, actor_id: typeof row.actor_id === 'string' ? row.actor_id : 'unknown' }
      : { device_id: typeof row.device_id === 'string' ? row.device_id : mine.device_id, actor_id: typeof row.actor_id === 'string' ? row.actor_id : mine.actor_id };
    const stamped: Row = { ...row, device_id: ids.device_id, ...(origin && typeof row.actor_id !== 'string' ? {} : { actor_id: ids.actor_id }) };
    await (op === 'insert' ? db.table(table).add(stamped) : db.table(table).put(stamped));
    if (row.farm_id !== DEMO_FARM_ID) await enqueue(db, row.farm_id, table, row.id, op, table === 'media' ? { ...stamped, data: undefined } : stamped, origin ? ids : { device_id: mine.device_id, actor_id: mine.actor_id }); // photo bytes stay in `media`; the upload reads them there
  });
  await refreshPending(db);
}

/** Owner settings (e.g. the data controller details): same rule, one transaction, queued for sync. */
export async function putSetting(db: AppDB, farmId: string, key: string, value: unknown): Promise<void> {
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    await db.settings.put({ key, value });
    await enqueue(db, farmId, 'settings', key, 'update', { key, value }, { device_id: await deviceId(db), actor_id: await actorId(db) });
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

/** Device-local settings (e.g. when the last backup was made): written here, NOT queued for the server. */
export async function putLocal(db: AppDB, key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
