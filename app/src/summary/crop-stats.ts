import { parseDecimal, parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// «Από τις καταγραφές σας» and «Ρυθμός συγκομιδής»: arithmetic on the owner's OWN records and on the owner's OWN estimate. Nothing here comes from a book, nothing is a default:
// no records = nothing returned (the screen says «άγνωστο»). Information only; it decides nothing and advises nothing.
export const MIN_RECORDS = 3;          // a statistic with fewer records than this is shown as «λίγα δεδομένα» (the screen compares `n` with it)
export const isFew = (n: number): boolean => n < MIN_RECORDS;          // below this many records the screen says «λίγα δεδομένα» (a display rule, not an agronomic number)
const DAY_MS = 86_400_000;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const dayOf = (iso: string): string => { const ms = Date.parse(iso); return Number.isFinite(ms) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms) : ''; };
const daysBetween = (a: string, b: string): number => (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS;   // both at 12:00 UTC: a whole number of days, nothing to round
const decimal = (s: string): number | undefined => { const d = parseDecimal(s); return d.known ? parseFloat(d.value) : undefined; };

export interface CropStats {
  /** mean crates per στρέμμα per recorded harvest (crates ÷ the planting's area) */
  yield?: { perStrema: number; n: number };
  /** mean days between two harvest DAYS of the same planting */
  gap?: { days: number; n: number };
  /** records that could not be used (unreadable crate number, planting without a valid area) */
  unusable: number;
}

export function cropStats(cropId: string, plantings: readonly Row[], harvests: readonly Row[]): CropStats {
  const mine = new Map(plantings.filter((p) => p.crop_id === cropId && !p.deleted_at).map((p) => [text(p.id), p]));
  let sum = 0; let n = 0; let unusable = 0;
  const daysOf = new Map<string, Set<string>>();
  for (const h of harvests) {
    const p = mine.get(text(h.planting_id));
    if (!p || h.deleted_at) continue;
    const day = dayOf(text(h.harvested_at));
    if (day !== '') { const set = daysOf.get(text(p.id)) ?? new Set<string>(); set.add(day); daysOf.set(text(p.id), set); }
    const crates = parseWhole<'Crates'>(text(h.crates_str)); const area = decimal(text(p.area_str));
    if (!crates.known || area === undefined || area <= 0) { unusable += 1; continue; }
    sum += crates.value / area; n += 1;
  }
  let gapSum = 0; let gaps = 0;
  for (const set of daysOf.values()) {
    const days = [...set].sort();
    for (let i = 1; i < days.length; i += 1) { gapSum += daysBetween(days[i - 1] as string, days[i] as string); gaps += 1; }
  }
  const out: CropStats = { unusable };
  if (n > 0) out.yield = { perStrema: sum / n, n };
  if (gaps > 0) out.gap = { days: gapSum / gaps, n: gaps };
  return out;
}

export interface PlanInput { crates: string; end: string }
export type Pace = { known: true; days: number; perDay: number; endDay: string } | { known: false; reason: 'no-estimate' | 'bad-crates' | 'bad-end' };
/** The owner's estimate of the crates still to come and the day the picking should last until → crates per day. Not an estimate of the field: his number, divided. */
export function harvestPace(plan: PlanInput | undefined, today: string): Pace {
  if (plan === undefined) return { known: false, reason: 'no-estimate' };
  const crates = decimal(plan.crates);
  if (crates === undefined || crates <= 0) return { known: false, reason: 'bad-crates' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.end)) return { known: false, reason: 'bad-end' };
  const days = daysBetween(today, plan.end);
  if (!(days > 0)) return { known: false, reason: 'bad-end' };
  return { known: true, days, perDay: crates / days, endDay: plan.end };
}

/** Crates cut in the last `windowDays` days (today included) for one crop, ÷ the window: what the records show was really picked per day. Unreadable crate numbers are not counted (and not zero). */
export function recentPace(cropId: string, plantings: readonly Row[], harvests: readonly Row[], today: string, windowDays: number): { perDay: number; crates: number } | undefined {
  const mine = new Set(plantings.filter((p) => p.crop_id === cropId && !p.deleted_at).map((p) => text(p.id)));
  let crates = 0; let any = false;
  for (const h of harvests) {
    if (h.deleted_at || !mine.has(text(h.planting_id))) continue;
    const day = dayOf(text(h.harvested_at)); const age = day === '' ? -1 : daysBetween(day, today);
    if (age < 0 || age >= windowDays) continue;
    const c = parseWhole<'Crates'>(text(h.crates_str));
    if (c.known) { crates += c.value; any = true; }
  }
  return any ? { perDay: crates / windowDays, crates } : undefined;
}
