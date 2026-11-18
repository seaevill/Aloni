// What the SERVER's answers do to this phone's database. Only this file (and repo/index.ts) may write to Dexie (ESLint W01); the sync engine calls it.
import type { AppDB, FarmTable, OutboxRow, Row } from '../db/schema';
import { isAppendOnly, refreshPending } from './index';

/** Columns the server sets itself (the phone may never send them back): stripped from every pulled row so an edit of a pulled record is accepted. */
const SERVER_ONLY = ['server_seq', 'sync_xid', 'hash', 'prev_hash', 'created_by', 'received_at', 'assigned_to', 'done_by'] as const;

export interface ServerAnswer { status: 'applied' | 'duplicate' | 'rejected'; code?: string; reason?: string }

/** The server accepted these ops (or had them already): they leave the queue. */
export async function markAcked(db: AppDB, opIds: readonly string[]): Promise<void> {
  await db.outbox.where('op_id').anyOf([...opIds]).modify({ status: 'acked' });
  await refreshPending(db);
}

/** The server refused: kept, with its reason, so the screen can show it. Nothing is retried by itself (a refused op would be refused again). */
export async function markRejected(db: AppDB, answers: ReadonlyMap<string, ServerAnswer>): Promise<void> {
  for (const [opId, a] of answers) await db.outbox.update(opId, { status: 'rejected', code: a.code ?? '', reason: a.reason ?? '' });
  await refreshPending(db);
}

/** The owner has seen a refused record: it leaves the list (the record itself stays on the phone). */
export async function dismissRejected(db: AppDB, opId: string): Promise<void> {
  await db.outbox.delete(opId);
  await refreshPending(db);
}

/**
 * Pulled rows into the local tables. A record this phone still has changes for (pending or refused) is NOT overwritten: the phone's own version wins
 * until the server has answered it. Append-only records are only ever ADDED (they never change). Returns how many rows were written.
 */
export async function applyPulled(db: AppDB, farmId: string, rows: ReadonlyArray<{ table: string; row: Row }>): Promise<number> {
  const open = new Set((await db.outbox.where('farm_id').equals(farmId).filter((o: OutboxRow) => o.status !== 'acked').toArray()).map((o) => `${o.table}:${o.row_id}`));
  let n = 0;
  await db.transaction('rw', db.tables, async () => {
    for (const { table, row } of rows) {
      if (row.farm_id !== farmId || !db.tables.some((t) => t.name === table) || open.has(`${table}:${row.id}`)) continue;
      const clean: Row = { ...row };
      for (const k of SERVER_ONLY) delete (clean as Record<string, unknown>)[k];
      const t = db.table(table as FarmTable);
      if (isAppendOnly(table)) { if (!(await t.get(row.id))) { await t.add(clean); n++; } } else { await t.put(clean); n++; }
    }
  });
  return n;
}

const cursorKey = (farmId: string) => `sync_cursor:${farmId}`;
/** The pull position of this phone for one farm ({x, s, g, v} as the server hands it out; null = from the start). Device-local: never queued. */
export async function getCursor(db: AppDB, farmId: string): Promise<unknown> { return (await db.settings.get(cursorKey(farmId)))?.value ?? null; }
export async function setCursor(db: AppDB, farmId: string, cursor: unknown): Promise<void> { await db.settings.put({ key: cursorKey(farmId), value: cursor }); }
