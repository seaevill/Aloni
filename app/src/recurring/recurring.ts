import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Επαναλαμβανόμενες εργασίες» («Κάθε Δευτέρα: έλεγχος χωραφιού»): written once, shown on their weekday in the owner's job list and on the worker screen of the SAME phone.
// Kept on this phone per farm (a server table would be a separate SQL file): the screen says so. Nothing here is a spray, a dose or advice; it is a reminder line the owner wrote himself.
export interface Rule { id: string; weekday: number; title: string; /** 'all' = every field, or a parcel id */ scope: string }
const key = (farm: string): string => `recurring:${farm}`;
const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** ISO weekday of a calendar day: Monday = 1 … Sunday = 7. */
export function weekdayOf(day: string): number | undefined {
  if (!DAY.test(day)) return undefined;
  const ms = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(ms)) return undefined;
  const d = new Date(ms).getUTCDay();
  return d === 0 ? 7 : d;
}
/** The first day on or after `today` with that weekday. */
export function nextOccurrence(weekday: number, today: string): string | undefined {
  const now = weekdayOf(today);
  if (now === undefined) return undefined;
  const ahead = (weekday - now + 7) % 7;
  return new Date(Date.parse(`${today}T12:00:00Z`) + ahead * DAY_MS).toISOString().slice(0, 10);
}
export const dueToday = (rules: readonly Rule[], today: string): Rule[] => rules.filter((r) => r.weekday === weekdayOf(today));

export async function loadRules(db: AppDB, farm: string): Promise<Rule[]> {
  return ((await db.settings.get(key(farm)))?.value as Rule[] | undefined) ?? [];
}
export async function addRule(db: AppDB, farm: string, input: Omit<Rule, 'id'>, id: string): Promise<void> {
  const title = input.title.trim();
  if (title === '') throw new Error('no title');
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7) throw new Error('bad weekday');
  await putLocal(db, key(farm), [...(await loadRules(db, farm)), { id, weekday: input.weekday, title, scope: input.scope }]);
}
export async function removeRule(db: AppDB, farm: string, id: string): Promise<void> {
  await putLocal(db, key(farm), (await loadRules(db, farm)).filter((r) => r.id !== id));
}
