import { parseDecimal } from '@aloni/rules-core';
import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// «Σπόρος»: the seed needed for a planting = the seed rate (kg per στρέμμα) that the GROWER or his agronomist wrote × the planting's area. The app proposes no rate and has none built in.
// Rates are kept per farm and crop on this phone. No rate / no area = unknown with the reason, never 0.
const key = (farm: string): string => `seed_rate:${farm}`;
export type Rates = Record<string, string>;
export type Seed = { known: true; kg: number } | { known: false; reason: 'no-rate' | 'no-area' };

const positive = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const d = parseDecimal(s);
  if (!d.known) return undefined;
  const n = parseFloat(d.value);
  return n > 0 ? n : undefined;
};
export function seedKg(rate: string | undefined, area: string): Seed {
  const r = positive(rate);
  if (r === undefined) return { known: false, reason: 'no-rate' };
  const a = positive(area);
  if (a === undefined) return { known: false, reason: 'no-area' };
  return { known: true, kg: r * a };
}
export async function loadRates(db: AppDB, farm: string): Promise<Rates> {
  return ((await db.settings.get(key(farm)))?.value as Rates | undefined) ?? {};
}
export async function setRate(db: AppDB, farm: string, cropId: string, rate: string): Promise<void> {
  if (positive(rate.trim()) === undefined) throw new Error('bad rate');
  await putLocal(db, key(farm), { ...(await loadRates(db, farm)), [cropId]: rate.trim() });
}
export async function removeRate(db: AppDB, farm: string, cropId: string): Promise<void> {
  const { [cropId]: _gone, ...rest } = await loadRates(db, farm);
  await putLocal(db, key(farm), rest);
}
