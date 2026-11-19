// MET Norway Locationforecast 2.0, endpoint «complete» (PURE: no Deno, no network of its own: the caller passes `fetcher`). Beta weather source (DECISIONS 2026-11-19).
// Free, no key. Terms of use (api.met.no/doc/TermsOfService) as the owner stated them on 2026-11-19; NOT yet checked against the page itself (it cannot be reached from the build machine):
//   * an identifying User-Agent «Aloni/<version> https://github.com/seaevill/Aloni» (no e-mail in the repository),
//   * coordinates with at most 4 decimals,
//   * respect «Expires» and «Last-Modified»: do not ask again before Expires, and ask with If-Modified-Since afterwards (a 304 = unchanged),
//   * the server calls MET, never a phone (one scheduled run every 6 hours).
// Units: MET gives wind in m/s; it is converted to km/h here (× 3.6, kept to 2 decimals). Every other field is already °C, %, mm. A missing value stays null — never 0, never a guess.
import type { DayRow, Forecast, HourRow } from '../types.ts';

export const METNO_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
export const USER_AGENT_HOME = 'https://github.com/seaevill/Aloni';
export const userAgent = (version: string): string => `Aloni/${version} ${USER_AGENT_HOME}`;

export interface MetFetch { ok: boolean; status: number; json: () => Promise<unknown>; headers: { get(name: string): string | null } }
export type MetFetcher = (url: string, init: { headers: Record<string, string> }) => Promise<MetFetch>;

/** At most 4 decimals (MET rule): rounded to 4 places, never padded with zeros. */
export const coord = (v: number): string => String(Math.round(v * 10_000) / 10_000);
export const metUrl = (lat: number, lon: number, altitude?: number): string => `${METNO_URL}?lat=${coord(lat)}&lon=${coord(lon)}${altitude === undefined ? '' : `&altitude=${Math.round(altitude)}`}`;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** m/s → km/h, two decimals (5 m/s = 18 km/h; 1.1 m/s = 3.96 km/h). */
export const msToKmh = (v: number | null): number | null => (v === null ? null : Number((v * 3.6).toFixed(2)));

const ATHENS_PARTS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' });
/** The Athens calendar day and clock hour of a UTC instant. */
export function athensDayHour(utcIso: string): { day: string; hour: number } | undefined {
  const ms = Date.parse(utcIso);
  if (!Number.isFinite(ms)) return undefined;
  const p = Object.fromEntries(ATHENS_PARTS.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** A day needs at least this many hourly points before a min / max is shown for it (a day of 6-hourly points, far ahead, shows none: nothing is made up). */
export const MIN_POINTS_FOR_DAY = 6;
const HOUR_MS = 3_600_000;

export function parseMetno(json: unknown, fallbackIssuedAt: string): Forecast | undefined {
  const o = json as { geometry?: { coordinates?: unknown }; properties?: { meta?: { updated_at?: unknown }; timeseries?: unknown } } | null;
  const series = o?.properties?.timeseries;
  if (!Array.isArray(series) || series.length === 0) return undefined;
  const hours: HourRow[] = [];
  const stepOk: boolean[] = [];   // whether this point is followed by a point exactly one hour later (an hourly stretch)
  for (const e of series) {
    const t = (e as { time?: unknown }).time;
    if (typeof t !== 'string' || !athensDayHour(t)) continue;
    const d = (e as { data?: { instant?: { details?: Record<string, unknown> }; next_1_hours?: { details?: Record<string, unknown> } } }).data;
    const i = d?.instant?.details;
    const at = new Date(Date.parse(t)).toISOString().replace(/\.\d{3}Z$/, 'Z');
    hours.push({ at, temp_c: num(i?.air_temperature), dewpoint_c: num(i?.dew_point_temperature), rh_pct: num(i?.relative_humidity), wind_kmh: msToKmh(num(i?.wind_speed)), gust_kmh: msToKmh(num(i?.wind_speed_of_gust)),
      rain_mm: num(d?.next_1_hours?.details?.precipitation_amount), cloud_pct: num(i?.cloud_area_fraction) });
  }
  if (hours.length === 0 || hours.every((h) => h.temp_c === null)) return undefined;
  hours.forEach((h, k) => { const n = hours[k + 1]; stepOk.push(n !== undefined && Date.parse(n.at) - Date.parse(h.at) === HOUR_MS); });
  // days: grouped by the ATHENS calendar day; only hourly stretches count
  const byDay = new Map<string, { temps: number[]; rains: Array<number | null>; hourly: number }>();
  hours.forEach((h, k) => {
    const ad = athensDayHour(h.at)!;
    const g = byDay.get(ad.day) ?? { temps: [], rains: [], hourly: 0 };
    if (stepOk[k] || (k > 0 && stepOk[k - 1])) { g.hourly += 1; if (h.temp_c !== null) g.temps.push(h.temp_c); g.rains.push(h.rain_mm); }
    byDay.set(ad.day, g);
  });
  const days: DayRow[] = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, g]) => {
    const enough = g.hourly >= MIN_POINTS_FOR_DAY && g.temps.length > 0;
    const fullDay = g.hourly >= 23 && g.rains.every((r) => r !== null);          // the rain total only for a whole day of hourly values (23–25 points: DST days)
    return { day, tmin: enough ? Math.min(...g.temps) : null, tmax: enough ? Math.max(...g.temps) : null, rain_mm: fullDay ? Number(g.rains.reduce<number>((a, r) => a + (r as number), 0).toFixed(2)) : null, sunrise: null, sunset: null };
  });
  const updated = o?.properties?.meta?.updated_at;
  const alt = (o?.geometry?.coordinates as unknown[] | undefined)?.[2];
  return { model: 'metno', issued_at: typeof updated === 'string' && Number.isFinite(Date.parse(updated)) ? new Date(Date.parse(updated)).toISOString().replace(/\.\d{3}Z$/, 'Z') : fallbackIssuedAt, cell_elev_m: num(alt), hours, days };
}

export interface Cache { lastModified: string | undefined; expires: string | undefined }
export type MetResult =
  | { ok: true; status: 'fresh'; forecast: Forecast; cache: Cache }
  | { ok: true; status: 'not_modified'; cache: Cache }
  | { ok: true; status: 'skipped'; cache: Cache }       // before «Expires»: NO request was made
  | { ok: false; error: string };

/** One parcel. Before the stored `expires` nothing is requested; afterwards the request carries If-Modified-Since, and a 304 only moves the expiry. */
export async function fetchMetno(lat: number, lon: number, fetcher: MetFetcher, ua: string, nowIso: string, prior: Cache = { lastModified: undefined, expires: undefined }, altitude?: number): Promise<MetResult> {
  if (prior.expires !== undefined && Number.isFinite(Date.parse(prior.expires)) && Date.parse(nowIso) < Date.parse(prior.expires)) return { ok: true, status: 'skipped', cache: prior };
  const headers: Record<string, string> = { 'user-agent': ua, accept: 'application/json' };
  if (prior.lastModified) headers['if-modified-since'] = prior.lastModified;
  try {
    const res = await fetcher(metUrl(lat, lon, altitude), { headers });
    const cache: Cache = { lastModified: res.headers.get('last-modified') ?? prior.lastModified, expires: res.headers.get('expires') ?? undefined };
    if (res.status === 304) return { ok: true, status: 'not_modified', cache };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const f = parseMetno(await res.json(), nowIso.replace(/\.\d{3}Z$/, 'Z'));
    return f ? { ok: true, status: 'fresh', forecast: f, cache } : { ok: false, error: 'unusable answer' };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'failed' }; }
}
