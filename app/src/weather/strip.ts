// Weather for the screens: what the `weather` table holds (per parcel, one entry per day), shown as it is. Nothing here decides or advises anything;
// a day without data stays empty («—»). Values are kept exactly as stored (no rounding, no invented fill-in).
export interface Day { date: string; tmin?: number; tmax?: number; rain?: number; gust?: number }

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** The stored entries of one parcel as days; an entry without a real date is dropped. */
export function parseDays(days: readonly unknown[] | undefined): Day[] {
  const out: Day[] = [];
  for (const d of days ?? []) {
    if (typeof d !== 'object' || d === null) continue;
    const r = d as Record<string, unknown>;
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    out.push({ date: r.date, tmin: num(r.tmin), tmax: num(r.tmax), rain: num(r.rain_mm), gust: num(r.gust_kmh) });
  }
  return out;
}

export const dayOf = (days: readonly Day[], date: string): Day | undefined => days.find((d) => d.date === date);

const lowest = (xs: Array<number | undefined>): number | undefined => { const k = xs.filter((x): x is number => x !== undefined); return k.length ? Math.min(...k) : undefined; };
const highest = (xs: Array<number | undefined>): number | undefined => { const k = xs.filter((x): x is number => x !== undefined); return k.length ? Math.max(...k) : undefined; };

/** The farm's day: the coldest minimum, the warmest maximum, the most rain and the strongest gust over ALL parcels (the cautious reading). Undefined when no parcel has the day. */
export function farmDay(perParcel: ReadonlyArray<readonly Day[]>, date: string): Day | undefined {
  const found = perParcel.map((p) => dayOf(p, date)).filter((d): d is Day => d !== undefined);
  if (found.length === 0) return undefined;
  return { date, tmin: lowest(found.map((d) => d.tmin)), tmax: highest(found.map((d) => d.tmax)), rain: highest(found.map((d) => d.rain)), gust: highest(found.map((d) => d.gust)) };
}
