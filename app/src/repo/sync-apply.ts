// What the SERVER's answers do to this phone's database. Only this file (and repo/index.ts) may write to Dexie (ESLint W01); the sync engine calls it.
import type { AppDB, FarmTable, OutboxRow, Row } from '../db/schema';
import { isDeviceOnlyKey } from './backup';
import { fromServer } from './from-server';
import { isAppendOnly, refreshPending } from './index';

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
export async function applyPulled(db: AppDB, farmId: string, rows: ReadonlyArray<{ table: string; row: Record<string, unknown> }>): Promise<number> {
  const open = new Set((await db.outbox.where('farm_id').equals(farmId).filter((o: OutboxRow) => o.status !== 'acked').toArray()).map((o) => `${o.table}:${o.row_id}`));
  let n = 0;
  await db.transaction('rw', db.tables, async () => {
    for (const p of rows) {
      if (p.row.farm_id !== farmId) continue;
      const { table, row: clean } = fromServer(p.table, p.row);   // the server's shape becomes the phone's shape (columns, text numbers, sign-off, instants)
      if (table === 'settings') { // an owner setting: the key is its id; this phone's own device-only keys are never replaced
        const key = clean.key;
        if (typeof key === 'string' && !isDeviceOnlyKey(key) && !open.has(`settings:${key}`)) { await db.settings.put({ key, value: clean.value }); n++; }
        continue;
      }
      const id = clean.id;
      if (typeof id !== 'string' || !db.tables.some((t) => t.name === table) || open.has(`${table}:${id}`)) continue;
      const t = db.table(table as FarmTable);
      const local = await t.get(id);
      if (isAppendOnly(table)) { if (!local) { await t.add(clean as Row); n++; } continue; }
      await t.put(local ? keepSignOffExtras(local, clean as Row) : (clean as Row)); n++;
    }
  });
  return n;
}

/** The server has no column for the note and photo kept with an approval (display only): the same approval, pulled back, keeps what this phone already has. */
function keepSignOffExtras(local: Row, pulled: Row): Row {
  const a = local.sign_off as Record<string, unknown> | undefined; const b = pulled.sign_off as Record<string, unknown> | undefined;
  if (!a || !b || a.by !== b.by || a.on !== b.on || a.fingerprint !== b.fingerprint) return pulled;
  return { ...pulled, sign_off: { ...b, ...(a.note === undefined ? {} : { note: a.note }), ...(a.photo_id === undefined ? {} : { photo_id: a.photo_id }) } };
}

/** The weather of this farm as the server shows it (one entry per parcel: its days). Device-local, information only: replaces what this phone had, never queued, never part of a backup restore of records. */
export async function replaceWeather(db: AppDB, farmId: string, parcels: ReadonlyArray<{ parcel_id: string; days: unknown[] }>): Promise<void> {
  await db.transaction('rw', db.weather, async () => {
    await db.weather.where('farm_id').equals(farmId).delete();
    for (const p of parcels) if (typeof p.parcel_id === 'string' && Array.isArray(p.days)) await db.weather.put({ id: p.parcel_id, farm_id: farmId, parcel_id: p.parcel_id, days: p.days });
  });
}

const cursorKey = (farmId: string) => `sync_cursor:${farmId}`;
/** The pull position of this phone for one farm ({x, s, g, v} as the server hands it out; null = from the start). Device-local: never queued. */
export async function getCursor(db: AppDB, farmId: string): Promise<unknown> { return (await db.settings.get(cursorKey(farmId)))?.value ?? null; }
export async function setCursor(db: AppDB, farmId: string, cursor: unknown): Promise<void> { await db.settings.put({ key: cursorKey(farmId), value: cursor }); }

/** Device-local marker: a pull of this farm has run to its end (the server said «no more»). A cursor alone is not enough: it is also written after each page of a pull that is still going. */
export const PULL_DONE_PREFIX = 'pull_done:';
export async function markPullDone(db: AppDB, farmId: string): Promise<void> { await db.settings.put({ key: `${PULL_DONE_PREFIX}${farmId}`, value: true }); }
export async function pullDone(db: AppDB, farmId: string): Promise<boolean> { return (await db.settings.get(`${PULL_DONE_PREFIX}${farmId}`))?.value === true; }
