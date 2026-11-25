import { parseDecimal } from '@aloni/rules-core';
import type { Day } from '../weather/strip';

// «Νερό αυτή την εβδομάδα»: the water the plants lost in the last 7 days (ET0 × Kc) against the rain of the same days. Information only: it never says «water now» and sends nothing.
// ET0 comes from the stored weather (the free source does not give it: then the need is unknown, with the reason), Kc is typed by the owner (from the agronomist). Nothing is assumed.
export const WEEK_DAYS = 7;
export type Part = { known: true; mm: number } | { known: false; reason: 'no-et0' | 'no-kc' | 'no-rain' };
export interface WeekWater { rain: Part; need: Part; gap: Part }
const DAY_MS = 86_400_000;
const lastDays = (today: string): string[] => { const base = Date.parse(`${today}T12:00:00Z`); return Array.from({ length: WEEK_DAYS }, (_, i) => new Date(base - (WEEK_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10)); };

export function weekWater(days: readonly Day[], today: string, kc: string | undefined): WeekWater {
  const dates = lastDays(today);
  const rows = dates.map((d) => days.find((x) => x.date === d));
  let rain = 0; let rainOk = true; let et0 = 0; let et0Ok = true;
  for (const r of rows) {
    if (r?.rain === undefined) rainOk = false; else rain += r.rain;
    if (r?.et0 === undefined) et0Ok = false; else et0 += r.et0;
  }
  const rainPart: Part = rainOk ? { known: true, mm: rain } : { known: false, reason: 'no-rain' };
  const k = kc === undefined ? undefined : parseDecimal(kc);
  const need: Part = !et0Ok ? { known: false, reason: 'no-et0' } : k === undefined || !k.known ? { known: false, reason: 'no-kc' } : { known: true, mm: et0 * parseFloat(k.value) };
  const gap: Part = !need.known ? need : !rainPart.known ? rainPart : { known: true, mm: need.mm - rainPart.mm };
  return { rain: rainPart, need, gap };
}

/** The water to bring, as a volume: the need (mm) × the area. 1 mm over 1 στρέμμα (1000 m²) is exactly 1 m³. An unknown need keeps its reason; a missing or unreadable area is unknown, never 0. */
export type Volume = { known: true; m3: number } | { known: false; reason: 'no-et0' | 'no-kc' | 'no-rain' | 'no-area' };
export function volumeFor(need: Part, areaStr: readonly string[]): Volume {
  if (!need.known) return need;
  if (areaStr.length === 0) return { known: false, reason: 'no-area' };
  let area = 0;
  for (const a of areaStr) { const d = parseDecimal(a); if (!d.known) return { known: false, reason: 'no-area' }; area += parseFloat(d.value); }
  return { known: true, m3: need.mm * area };
}
/** Hours of irrigation = m³ ÷ the flow (m³ per hour) the owner typed; no flow, a bad flow or a flow of 0 = unknown. */
export function hoursFor(m3: number, flow: string | undefined): { known: true; hours: number } | { known: false } {
  const f = flow === undefined ? undefined : parseDecimal(flow);
  if (f === undefined || !f.known || !(parseFloat(f.value) > 0)) return { known: false };
  return { known: true, hours: m3 / parseFloat(f.value) };
}
