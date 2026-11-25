import { DEMO_FARM_ID } from '../config';
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

// The season target lives on the server (SQL 0041) only after the owner confirmed a migration ≥ 0041; before that it stays on this phone exactly as before.
export const CROP_TARGET_MIGRATION = '0041';
export function serverTargetsOf(confirmed: Confirmed | undefined): boolean {
  const m = confirmed?.migration;
  return typeof m === 'string' && /^\d{4}$/.test(m) && m >= CROP_TARGET_MIGRATION;
}
export async function serverTargetsOn(db: AppDB): Promise<boolean> {
  return serverTargetsOf((await db.settings.get(READINESS_KEY))?.value as Confirmed | undefined);
}

// Notes for the next days live on the server (SQL 0039) once the owner confirmed a migration ≥ 0039; a SIGNED-IN WORKER's phone (a real farm) has no readiness card: it is on the server by definition.
export const DAY_NOTES_MIGRATION = '0039';
export function serverNotesOf(confirmed: Confirmed | undefined): boolean {
  const m = confirmed?.migration;
  return typeof m === 'string' && /^\d{4}$/.test(m) && m >= DAY_NOTES_MIGRATION;
}
export async function serverNotesOn(db: AppDB, workerOnRealFarm: boolean): Promise<boolean> {
  return workerOnRealFarm || serverNotesOf((await db.settings.get(READINESS_KEY))?.value as Confirmed | undefined);
}

// Cut records and fertilise / irrigate records live on the server (SQL 0042, OWNER ONLY) once the owner confirmed a migration ≥ 0042 — never on the Demo farm. Dormant until the readiness card asks for 0042.
export const FIELD_RECORDS_MIGRATION = '0042';
export function serverFieldOf(confirmed: Confirmed | undefined): boolean {
  const m = confirmed?.migration;
  return typeof m === 'string' && /^\d{4}$/.test(m) && m >= FIELD_RECORDS_MIGRATION;
}
export async function serverFieldOn(db: AppDB, farm: string): Promise<boolean> {
  return farm !== DEMO_FARM_ID && serverFieldOf((await db.settings.get(READINESS_KEY))?.value as Confirmed | undefined);
}
