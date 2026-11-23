import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Φορτώθηκε»: the owner confirms that a customer's crates of one crop for one day were loaded onto the vehicle. That takes them off the STORE. Kept on this phone per farm until the server table of the store movements exists
// (SQL 0042, separate PR); one record per day × customer × crop, so confirming twice never takes the crates off twice, and «undo» puts them back. Information only: nothing here sells, sends or decides.
export interface OutRecord { day: string; client: string; slug: string; crates: number; at: string }
const key = (farm: string): string => `store_out:${farm}`;
export const outKey = (day: string, client: string, slug: string): string => `${day}|${client}|${slug}`;

export async function loadOuts(db: AppDB, farm: string): Promise<Record<string, OutRecord>> {
  const v = (await db.settings.get(key(farm)))?.value as Record<string, OutRecord> | undefined;
  return v ?? {};
}
export async function markLoaded(db: AppDB, farm: string, rec: OutRecord): Promise<void> {
  const all = await loadOuts(db, farm);
  await putLocal(db, key(farm), { ...all, [outKey(rec.day, rec.client, rec.slug)]: rec });
}
export async function undoLoaded(db: AppDB, farm: string, day: string, client: string, slug: string): Promise<void> {
  const all = { ...(await loadOuts(db, farm)) };
  delete all[outKey(day, client, slug)];
  await putLocal(db, key(farm), all);
}
/** Crates taken off the store, per crop slug (every day up to now). */
export function outBySlug(outs: Readonly<Record<string, OutRecord>>): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const o of Object.values(outs)) { const before = sums[o.slug]; if (before === undefined) sums[o.slug] = o.crates; else sums[o.slug] = before + o.crates; }
  return sums;
}
