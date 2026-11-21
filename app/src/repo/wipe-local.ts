import type { AppDB } from '../db/schema';

/** Deletes the whole database of the phone (records, settings, the outbox): the owner's «delete the data on this phone» (E7), after src/account/wipe.ts has said it is allowed. The append-only guard stops row-by-row deletes on purpose, so the database itself is dropped. The caller reloads the app afterwards. */
export async function wipeThisPhone(db: AppDB): Promise<void> {
  await db.delete();
}
