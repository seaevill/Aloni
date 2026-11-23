import { dateAfterDays, parseDecimal, parseWhole } from '@aloni/rules-core';
import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Πρόγραμμα λίπανσης»: the agronomist's plan, typed IN HIS WORDS (a day after sowing and a line of text) with a photo of his paper. Kept on this phone per farm.
// The app suggests no fertiliser and no quantity, works nothing out, and sends no reminder (reminders stay closed until an agronomist has signed). Information only.
/** `kg_per_str` and `bag_kg` are optional numbers the grower typed (what his agronomist wrote, and the size of the bag he buys); the app proposes neither. */
export interface PlanItem { id: string; day: string; text: string; kg_per_str?: string; bag_kg?: string }
export interface FertPlan { items: PlanItem[]; photoId?: string }
export type Plans = Record<string, FertPlan>;
const key = (farm: string): string => `fert_plan:${farm}`;

export async function loadPlans(db: AppDB, farm: string): Promise<Plans> {
  return ((await db.settings.get(key(farm)))?.value as Plans | undefined) ?? {};
}
export async function addItem(db: AppDB, farm: string, plantingId: string, input: { day: string; text: string; kgPerStr?: string; bagKg?: string }, id: string): Promise<void> {
  const day = parseWhole<'Days'>(input.day);
  const text = input.text.trim();
  if (!day.known) throw new Error('bad day');
  if (text === '') throw new Error('no text');
  const extra: Pick<PlanItem, 'kg_per_str' | 'bag_kg'> = {};
  for (const [field, value] of [['kg_per_str', input.kgPerStr], ['bag_kg', input.bagKg]] as const) {
    const v = (value ?? '').trim();
    if (v === '') continue;
    const d = parseDecimal(v);
    if (!d.known || !/[1-9]/.test(d.value)) throw new Error('bad number');
    extra[field] = v;
  }
  const plans = await loadPlans(db, farm);
  const items = [...(plans[plantingId]?.items ?? []), { id, day: String(day.value), text, ...extra }].sort((a, b) => parseFloat(a.day) - parseFloat(b.day));
  await putLocal(db, key(farm), { ...plans, [plantingId]: { ...plans[plantingId], items } });
}
export async function removeItem(db: AppDB, farm: string, plantingId: string, id: string): Promise<void> {
  const plans = await loadPlans(db, farm); const plan = plans[plantingId];
  if (!plan) return;
  await putLocal(db, key(farm), { ...plans, [plantingId]: { ...plan, items: plan.items.filter((i) => i.id !== id) } });
}
export async function setPhoto(db: AppDB, farm: string, plantingId: string, photoId: string): Promise<void> {
  const plans = await loadPlans(db, farm);
  await putLocal(db, key(farm), { ...plans, [plantingId]: { items: plans[plantingId]?.items ?? [], photoId } });
}
/** The calendar day of «day N after sowing»; unknown when the sowing day or N is not a real value. */
export function dueDay(sownOn: string, day: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sownOn)) return undefined;
  const n = parseWhole<'Days'>(day);
  if (!n.known) return undefined;
  const d = dateAfterDays(sownOn, n.value);
  return d.known ? d.value : undefined;
}
