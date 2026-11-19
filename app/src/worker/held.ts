import type { AppDB, Row } from '../db/schema';
import { delLocal, putLocal, putMany, type Write } from '../repo';
import { queueCompletion } from './remote';

// «Saved» means saved (T4, 2026-11-19): a worker's action is kept on the phone THE MOMENT she taps (settings `held_actions`, device-only, never part of a backup), with its own timestamp. It is written
// as a record after 10 seconds, or at the next start of the app if the phone was closed first. «Αναίρεση» removes the pending entry: nothing was written, so the append-only records are untouched.
// One settings row PER ENTRY (`held_action:<id>`): holding, cancelling and committing different entries can never overwrite each other (review of T4: a single list lost updates).
export const HELD_PREFIX = 'held_action:';
export interface Completion { farm: string; jobId: string; at: string; start: string; note: string; lateReason: string }
export interface Held { id: string; at: string; writes?: Write[]; completion?: Completion }

export async function readHeld(db: AppDB): Promise<Held[]> {
  const rows = await db.settings.filter((r) => typeof r.key === 'string' && r.key.startsWith(HELD_PREFIX)).toArray();
  return rows.map((r) => r.value as Held).sort((a, b) => a.at.localeCompare(b.at));
}

/** Keeps the action. Await it BEFORE telling the worker it is saved. */
export async function holdAction(db: AppDB, h: Held): Promise<void> { await putLocal(db, `${HELD_PREFIX}${h.id}`, h); }
/** «Αναίρεση»: nothing was written; the pending entry goes. */
export async function cancelHeld(db: AppDB, id: string): Promise<void> { await delLocal(db, `${HELD_PREFIX}${id}`); }

async function run(db: AppDB, h: Held): Promise<void> {
  if (h.writes) await putMany(db, h.writes);
  if (h.completion) await queueCompletion(db, h.completion.farm, h.completion.jobId, h.completion.at, h.completion.start, h.completion.note, h.completion.lateReason);
}
/** Writes one pending action as records and removes its entry. A second run (the app was closed between the write and the removal) finds the rows already there and only removes the entry. */
export async function commitHeld(db: AppDB, id: string): Promise<void> {
  const h = (await db.settings.get(`${HELD_PREFIX}${id}`))?.value as Held | undefined;
  if (!h) return;
  try { await run(db, h); } catch (e) {
    const rows = (h.writes ?? []).filter((w) => w.op === 'insert');
    const there = await Promise.all(rows.map(async (w) => !!(await db.table(w.table).get((w.row as Row).id))));
    if (rows.length === 0 || !there.every(Boolean)) throw e;
  }
  await cancelHeld(db, id);
}
/** At start: whatever is still pending is written now (the phone was closed inside the 10 seconds). */
export async function commitAllHeld(db: AppDB): Promise<number> {
  const list = await readHeld(db);
  for (const h of list) await commitHeld(db, h.id).catch(() => undefined);
  return list.length;
}
