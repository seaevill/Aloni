import type { AppDB } from '../db/schema';
import { delLocal, put, putLocal } from '../repo';
import { cutRow } from '../fieldwork/server-rows';
import { serverFieldOn } from '../owner-records/mode';

// «Κοπή / καθαρισμός»: the owner records that a parcel was cut or cleaned (e.g. wild chicory shredded with the tractor); the counter «νέα βλάστηση: ημέρα N» counts the days since then.
// Kept on this phone per farm until the server accepts the record (SQL 0042 is a separate file, not applied): the screen says so. Information only: nothing here advises anything.
export const CUT_METHODS = ['shredder', 'hand', 'other'] as const;
export type CutMethod = (typeof CUT_METHODS)[number];
export interface CutRecord { id: string; parcel_id: string; day: string; method: CutMethod }
const key = (farm: string): string => `cuts:${farm}`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const localCuts = async (db: AppDB, farm: string): Promise<CutRecord[]> => ((await db.settings.get(key(farm)))?.value as CutRecord[] | undefined) ?? [];
/** SQL 0042 (owner only): once the owner confirmed it the records are server rows; what was typed on this phone before moves up ONCE (a new row each, same id) and the phone copy is removed. */
export async function loadCuts(db: AppDB, farm: string): Promise<CutRecord[]> {
  if (!(await serverFieldOn(db, farm))) return localCuts(db, farm);
  const old = await localCuts(db, farm);
  if (old.length > 0) { for (const c of old) await put(db, 'field_cuts', cutRow(c, farm, c.id, new Date().toISOString()), 'insert'); await delLocal(db, key(farm)); }
  return (await db.field_cuts.where('farm_id').equals(farm).toArray()).filter((r) => !r.deleted_at).map((r) => ({ id: String(r.id), parcel_id: String(r.parcel_id), day: String(r.day), method: r.method as CutMethod }));
}
export async function addCut(db: AppDB, farm: string, input: Omit<CutRecord, 'id'>, id: string): Promise<CutRecord> {
  if (!DAY.test(input.day) || !Number.isFinite(Date.parse(`${input.day}T12:00:00Z`))) throw new Error('bad day');
  if (!(CUT_METHODS as readonly string[]).includes(input.method)) throw new Error('bad method');
  if (input.parcel_id === '') throw new Error('no parcel');
  const rec: CutRecord = { id, ...input };
  if (await serverFieldOn(db, farm)) { await put(db, 'field_cuts', cutRow(input, farm, id, new Date().toISOString()), 'insert'); return rec; }
  await putLocal(db, key(farm), [...(await loadCuts(db, farm)), rec]);
  return rec;
}
export async function removeCut(db: AppDB, farm: string, id: string): Promise<void> {
  if (await serverFieldOn(db, farm)) {          // a record is never edited or deleted on the server: it is tombstoned, once
    const row = await db.field_cuts.get(id);
    if (row && !row.deleted_at) { const now = new Date().toISOString(); await put(db, 'field_cuts', { ...row, deleted_at: now, updated_at: now }, 'update'); }
    return;
  }
  await putLocal(db, key(farm), (await localCuts(db, farm)).filter((c) => c.id !== id));
}
/** The newest cut of the parcel on or before `today`, with the days since it (0 on the cut day). No cut = undefined. */
export function resprout(cuts: readonly CutRecord[], parcelId: string, today: string): { day: string; method: CutMethod; n: number } | undefined {
  const mine = cuts.filter((c) => c.parcel_id === parcelId && c.day <= today).sort((a, b) => b.day.localeCompare(a.day))[0];
  if (!mine) return undefined;
  return { day: mine.day, method: mine.method, n: (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${mine.day}T12:00:00Z`)) / DAY_MS };
}
