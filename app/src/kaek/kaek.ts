import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

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
