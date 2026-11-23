import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Κοπή / καθαρισμός»: the owner records that a parcel was cut or cleaned (e.g. wild chicory shredded with the tractor); the counter «νέα βλάστηση: ημέρα N» counts the days since then.
// Kept on this phone per farm until the server accepts the record (SQL 0042 is a separate file, not applied): the screen says so. Information only: nothing here advises anything.
export const CUT_METHODS = ['shredder', 'hand', 'other'] as const;
export type CutMethod = (typeof CUT_METHODS)[number];
export interface CutRecord { id: string; parcel_id: string; day: string; method: CutMethod }
const key = (farm: string): string => `cuts:${farm}`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export async function loadCuts(db: AppDB, farm: string): Promise<CutRecord[]> {
  return ((await db.settings.get(key(farm)))?.value as CutRecord[] | undefined) ?? [];
}
export async function addCut(db: AppDB, farm: string, input: Omit<CutRecord, 'id'>, id: string): Promise<CutRecord> {
  if (!DAY.test(input.day) || !Number.isFinite(Date.parse(`${input.day}T12:00:00Z`))) throw new Error('bad day');
  if (!(CUT_METHODS as readonly string[]).includes(input.method)) throw new Error('bad method');
  if (input.parcel_id === '') throw new Error('no parcel');
  const rec: CutRecord = { id, ...input };
  await putLocal(db, key(farm), [...(await loadCuts(db, farm)), rec]);
  return rec;
}
export async function removeCut(db: AppDB, farm: string, id: string): Promise<void> {
  await putLocal(db, key(farm), (await loadCuts(db, farm)).filter((c) => c.id !== id));
}
/** The newest cut of the parcel on or before `today`, with the days since it (0 on the cut day). No cut = undefined. */
export function resprout(cuts: readonly CutRecord[], parcelId: string, today: string): { day: string; method: CutMethod; n: number } | undefined {
  const mine = cuts.filter((c) => c.parcel_id === parcelId && c.day <= today).sort((a, b) => b.day.localeCompare(a.day))[0];
  if (!mine) return undefined;
  return { day: mine.day, method: mine.method, n: (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${mine.day}T12:00:00Z`)) / DAY_MS };
}
