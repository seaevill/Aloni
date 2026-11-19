// Weather for the screens: what the `weather` table holds (per parcel, one entry per day), shown as it is. Nothing here decides or advises anything;
// a day without data stays empty («—»). Values are kept exactly as stored (no rounding, no invented fill-in).
export interface Day { date: string; tmin?: number; tmax?: number; rain?: number; gust?: number; wind?: number; rh?: number; issued?: string; model?: string }

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** The stored entries of one parcel as days; an entry without a real date is dropped. */
export function parseDays(days: readonly unknown[] | undefined): Day[] {
  const out: Day[] = [];
  for (const d of days ?? []) {
    if (typeof d !== 'object' || d === null) continue;
    const r = d as Record<string, unknown>;
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    out.push({ date: r.date, tmin: num(r.tmin), tmax: num(r.tmax), rain: num(r.rain_mm), gust: num(r.gust_kmh), wind: num(r.wind_kmh), rh: num(r.rh_pct), issued: typeof r.issued_at === 'string' ? r.issued_at : undefined, model: typeof r.model === 'string' ? r.model : undefined });
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
  return { date, tmin: lowest(found.map((d) => d.tmin)), tmax: highest(found.map((d) => d.tmax)), rain: highest(found.map((d) => d.rain)), gust: highest(found.map((d) => d.gust)), wind: highest(found.map((d) => d.wind)), rh: highest(found.map((d) => d.rh)) };
}

/** After this many hours a forecast is shown as «παλιά δεδομένα» (a test keeps it equal to STALE_AFTER_HOURS of the weather job). */
export const STALE_AFTER_HOURS = 12;
/** The name the data must be shown under (the licence of MET Norway asks for it); the Open-Meteo models share one name. A source we do not know is shown by its own id: nothing is hidden. */
export const SOURCE_NAME: Readonly<Record<string, string>> = { metno: 'MET Norway (CC BY 4.0)', icon_eu: 'Open-Meteo', ecmwf_ifs: 'Open-Meteo' };

export interface Provenance { names: string[]; issued: string | undefined; stale: boolean }
/** Where the shown weather comes from and when it was issued (the NEWEST issue time of all parcels); undefined when no stored day says so (the demo data). Stale = older than 12 hours. */
export function provenance(perParcel: ReadonlyArray<readonly Day[]>, nowMs: number): Provenance | undefined {
  const days = perParcel.flat().filter((d) => d.model !== undefined);
  if (days.length === 0) return undefined;
  const names = [...new Set(days.map((d) => SOURCE_NAME[d.model!] ?? d.model!))];
  const times = days.flatMap((d) => (d.issued !== undefined && Number.isFinite(Date.parse(d.issued)) ? [Date.parse(d.issued)] : []));
  const newest = times.length === 0 ? undefined : Math.max(...times);
  return { names, issued: newest === undefined ? undefined : new Date(newest).toISOString(), stale: newest === undefined || nowMs - newest > STALE_AFTER_HOURS * 3_600_000 };
}
