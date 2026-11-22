import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// Where a harvest went (store / direct dispatch) and, for a direct dispatch, the receiver's optional name and phone. The server column comes with 0036 (and the owner-only receiver table with 0037); a push that names a column the server
// does not have is REFUSED, so until then the answer lives in this phone's settings, keyed by the harvest id, and is NEVER put on the synced row. Receiver name and phone: owner only, never shown on a worker screen.
export type Destination = 'store' | 'dispatch';
export interface DestinationRecord { d: Destination; name?: string; phone?: string }
const key = (farm: string): string => `harvest_dest:${farm}`;

export async function loadDestinations(db: AppDB, farm: string): Promise<Record<string, DestinationRecord>> {
  const v = (await db.settings.get(key(farm)))?.value as Record<string, DestinationRecord> | undefined;
  return v ?? {};
}

export async function saveDestination(db: AppDB, farm: string, harvestId: string, rec: DestinationRecord): Promise<void> {
  const all = await loadDestinations(db, farm);
  const clean: DestinationRecord = { d: rec.d };
  if (rec.d === 'dispatch' && rec.name !== undefined && rec.name.trim() !== '') clean.name = rec.name.trim();
  if (rec.d === 'dispatch' && rec.phone !== undefined && rec.phone.trim() !== '') clean.phone = rec.phone.trim();
  await putLocal(db, key(farm), { ...all, [harvestId]: clean });
}
