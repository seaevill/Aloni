import Dexie from 'dexie';
import type { AppDB } from './schema';

export interface LegacyResult { status: 'none' | 'deleted' | 'kept'; settingsCopied: number }

/**
 * The first builds (M0 to M1 PR 2) stored data in a database called `aloni-farm`. Its settings (the data controller
 * details) are carried over. The old database is deleted ONLY if every remaining row belongs to the Demo farm;
 * if it holds anything else it is kept untouched (and the app says so), because deleting cannot be undone.
 */
export async function migrateLegacyDb(db: AppDB, legacyName = 'aloni-farm'): Promise<LegacyResult> {
  if (!(await Dexie.exists(legacyName))) return { status: 'none', settingsCopied: 0 };
  const old = new Dexie(legacyName);
  await old.open();
  let settingsCopied = 0;
  let realRows = 0;
  try {
    for (const table of old.tables) {
      if (table.name === 'settings') {
        for (const row of await table.toArray()) if (!(await db.settings.get(row.key))) { await db.settings.put(row); settingsCopied += 1; }
      } else if (table.name !== 'farms') {
        realRows += await table.filter((r: { farmId?: string }) => r.farmId !== 'demo').count(); // `farms` only holds the empty farm records
      }
    }
  } finally { old.close(); }
  if (realRows > 0) return { status: 'kept', settingsCopied };
  await Dexie.delete(legacyName);
  return { status: 'deleted', settingsCopied };
}
