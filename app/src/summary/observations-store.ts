// The owner's «seen» list for worker observations (a farm setting; the observation rows themselves are append-only and never change).
import { activeFarm, dataVersion, db } from '../db';
import { putSetting } from '../repo';
import { REVIEWED_KEY } from './observations';

export async function seenObservationIds(): Promise<string[]> {
  const v = (await db.settings.get(REVIEWED_KEY))?.value;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
/** The owner has looked at it: it leaves «Για έλεγχο». Never deletes or edits the observation. */
export async function markObservationSeen(id: string): Promise<void> {
  const ids = await seenObservationIds();
  if (!ids.includes(id)) await putSetting(db, activeFarm.value, REVIEWED_KEY, [...ids, id]);
  dataVersion.value++;
}
