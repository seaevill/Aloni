import type { AppDB } from '../db/schema';
import { put, putLocal } from '../repo';
import { applyEdit } from '../records/edits';
import { serverFieldOn } from '../owner-records/mode';

// ΚΑΕΚ (Κωδικός Αριθμός Εθνικού Κτηματολογίου): the 12-digit national cadastre number of a plot, typed by the owner and shown on the parcel page.
// Kept on this phone per farm (the server `parcels` table has no such column yet; a column would be a separate SQL file). Nothing is looked up anywhere: no request leaves the phone.
const key = (farm: string): string => `kaek:${farm}`;
const KAEK = /^\d{12}$/;
export type KaekMap = Record<string, string>;

export const isKaek = (v: string): boolean => KAEK.test(v.trim());
export async function loadKaek(db: AppDB, farm: string): Promise<KaekMap> {
  return ((await db.settings.get(key(farm)))?.value as KaekMap | undefined) ?? {};
}
export const kaekOf = (map: Readonly<KaekMap>, parcelId: string): string | undefined => map[parcelId];
export async function setKaek(db: AppDB, farm: string, parcelId: string, value: string): Promise<void> {
  const v = value.trim();
  if (!KAEK.test(v)) throw new Error('bad kaek');
  await putLocal(db, key(farm), { ...(await loadKaek(db, farm)), [parcelId]: v });
}
export async function removeKaek(db: AppDB, farm: string, parcelId: string): Promise<void> {
  const { [parcelId]: _gone, ...rest } = await loadKaek(db, farm);
  await putLocal(db, key(farm), rest);
}

/** SQL 0042: on the server the ΚΑΕΚ is the `kaek` column of the parcel row (exactly 12 digits or nothing). Every change goes through the parcel's edit history, so a REASON is required (the owner writes it, nothing is invented); apply_one writes whole rows, so a row that lost `kaek` would empty it. */
export const kaekServerOn = (db: AppDB, farm: string): Promise<boolean> => serverFieldOn(db, farm);
export async function kaekOnRow(db: AppDB, parcelId: string): Promise<string | undefined> {
  const v = (await db.parcels.get(parcelId))?.kaek;
  return typeof v === 'string' && KAEK.test(v) ? v : undefined;
}
export async function saveKaekOnRow(db: AppDB, parcelId: string, value: string | undefined, reason: string): Promise<'ok' | 'reason' | 'nochange' | 'missing' | 'bad'> {
  const row = await db.parcels.get(parcelId);
  if (!row) return 'missing';
  const v = value === undefined ? undefined : value.trim();
  if (v !== undefined && !KAEK.test(v)) return 'bad';
  const e = applyEdit(row, { kaek: v }, reason, new Date().toISOString());
  if (e.kind === 'nochange') return 'nochange';
  if (e.kind === 'reason') return 'reason';
  await put(db, 'parcels', e.row, 'update');
  return 'ok';
}
