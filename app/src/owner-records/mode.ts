import type { AppDB } from '../db/schema';
import { READINESS_KEY, type Confirmed } from '../settings/readiness';

// Customers, orders and worker cards live on the SERVER (SQL 0037) only after the owner has said that 0037 is applied: the readiness card's «migration» confirmation names a migration ≥ 0037.
// Before that they stay in this phone's settings, exactly as before. The flag is a plain read of what the owner confirmed, never a guess about the server.
export const OWNER_RECORDS_MIGRATION = '0037';
export function serverRecordsOf(confirmed: Confirmed | undefined): boolean {
  const m = confirmed?.migration;
  return typeof m === 'string' && /^\d{4}$/.test(m) && m >= OWNER_RECORDS_MIGRATION;
}
export async function serverRecordsOn(db: AppDB): Promise<boolean> {
  return serverRecordsOf((await db.settings.get(READINESS_KEY))?.value as Confirmed | undefined);
}
