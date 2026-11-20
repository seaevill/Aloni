import { db, lastBackupAt, realFarmId } from '../db';
import { makeBackup, markBackupDone } from '../repo/backup';
import { APP_VERSION } from '../version';
import { downloadText } from './download';

/** Takes a backup of the real farm NOW: builds the file, hands it to the phone (download / share sheet), and records the time. Returns the number of records in it. Used by «Άλλα → Αντίγραφο» and by the go-live wizard. */
export async function exportBackupNow(): Promise<number> {
  const farm = await db.farms.get(realFarmId.value);
  const b = await makeBackup(db, { id: realFarmId.value, name: farm?.name ?? '' }, APP_VERSION);
  const now = new Date().toISOString();
  downloadText(`aloni-backup-${now.slice(0, 10)}.json`, JSON.stringify(b));
  await markBackupDone(db, now);
  lastBackupAt.value = now;
  return Object.values(b.tables).flat().length + b.settings.length;
}
