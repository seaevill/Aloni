// OPEN-METEO forecast client (PURE: no Deno, no network of its own: the caller passes `fetcher`). Used by the Supabase Edge Function `weather-fetch` (NOT deployed, no cron: Bora switches it on).
//
// LICENCE NOTE: the FREE Open-Meteo API is for NON-COMMERCIAL use only. Bora's farm sells produce, so a commercial plan (the `customer-api.open-meteo.com` host with an API key) or written
// permission is needed BEFORE this runs against his real parcels (open decision in CLAUDE.md: «Open-Meteo licence for Bora's own farm (ask them)»). The key, when there is one, comes from the function's
// environment, never from the repository.
//
// Models are DATA, not code (Open-Meteo changes model ids; DECISIONS 2026-11-17): ICON-EU first, ECMWF IFS HRES as the fallback. A missing value stays null — never 0, never a guess.
export type Model = 'icon_eu' | 'ecmwf_ifs';
export const MODELS: readonly Model[] = ['icon_eu', 'ecmwf_ifs'];
export const FREE_BASE = 'https://api.open-meteo.com/v1/forecast';
export const COMMERCIAL_BASE = 'https://customer-api.open-meteo.com/v1/forecast';

export interface HourRow { at: string; temp_c: number | null; rh_pct: number | null; wind_kmh: number | null; gust_kmh: number | null; rain_mm: number | null; cloud_pct: number | null }
export interface DayRow { day: string; tmin: number | null; tmax: number | null; rain_mm: number | null; sunrise: string | null; sunset: string | null }
export interface Forecast { model: Model; issued_at: string; cell_elev_m: number | null; hours: HourRow[]; days: DayRow[] }
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const HOURLY = ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_gusts_10m', 'precipitation', 'cloud_cover'] as const;
const DAILY = ['temperature_2m_min', 'temperature_2m_max', 'precipitation_sum', 'sunrise', 'sunset'] as const;

export function forecastUrl(lat: number, lon: number, model: Model, base: string = FREE_BASE, apiKey: string | undefined = undefined): string {
  const q = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), hourly: HOURLY.join(','), daily: DAILY.join(','), timezone: 'Europe/Athens', wind_speed_unit: 'kmh', precipitation_unit: 'mm', forecast_days: '7', models: model });
  if (apiKey) q.set('apikey', apiKey);
  return `${base}?${q.toString()}`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** «2026-11-20T10:00» on the ATHENS clock → «2026-11-20T08:00:00Z». The offset is found for THAT moment (summer/winter), not taken once for the whole answer. */
export function athensWallToUtc(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const asUtc = Date.parse(`${local}:00Z`);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  for (const hours of [2, 3]) {   // Athens is UTC+2 in winter, UTC+3 in summer
    const t = new Date(asUtc - hours * 3_600_000);
    const p = Object.fromEntries(fmt.formatToParts(t).map((x) => [x.type, x.value]));
    if (`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === local) return t.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  return null;
}

const series = (block: unknown, name: string, n: number): unknown[] => { const a = (block as Record<string, unknown> | undefined)?.[name]; return Array.isArray(a) && a.length === n ? a : new Array<unknown>(n).fill(null); };

/** Reads one Open-Meteo answer. Returns undefined when it is not usable (wrong shape, or the temperature series is empty): the caller then tries the next model. */
export function parseForecast(json: unknown, model: Model, issuedAt: string): Forecast | undefined {
  const o = json as { hourly?: { time?: unknown }; daily?: { time?: unknown }; elevation?: unknown } | null;
  const ht = o?.hourly?.time; const dt = o?.daily?.time;
  if (!Array.isArray(ht) || !Array.isArray(dt)) return undefined;
  const h = (n: string) => series(o?.hourly, n, ht.length); const d = (n: string) => series(o?.daily, n, dt.length);
  const hours: HourRow[] = []; const temp = h('temperature_2m');
  ht.forEach((t, i) => { const at = typeof t === 'string' ? athensWallToUtc(t) : null; if (at) hours.push({ at, temp_c: num(temp[i]), rh_pct: num(h('relative_humidity_2m')[i]), wind_kmh: num(h('wind_speed_10m')[i]), gust_kmh: num(h('wind_gusts_10m')[i]), rain_mm: num(h('precipitation')[i]), cloud_pct: num(h('cloud_cover')[i]) }); });
  if (hours.length === 0 || hours.every((r) => r.temp_c === null)) return undefined;
  const days: DayRow[] = dt.flatMap((day, i) => (typeof day === 'string' ? [{ day, tmin: num(d('temperature_2m_min')[i]), tmax: num(d('temperature_2m_max')[i]), rain_mm: num(d('precipitation_sum')[i]), sunrise: typeof d('sunrise')[i] === 'string' ? athensWallToUtc(String(d('sunrise')[i])) : null, sunset: typeof d('sunset')[i] === 'string' ? athensWallToUtc(String(d('sunset')[i])) : null }] : []));
  return { model, issued_at: issuedAt, cell_elev_m: num(o?.elevation), hours, days };
}

export interface Options { base?: string; apiKey?: string }
/** ICON-EU, then IFS HRES when the first fails (HTTP error, unreadable or empty answer). Both failing is an error that names both: nothing is invented. */
export async function fetchForecast(lat: number, lon: number, fetcher: Fetcher, issuedAt: string, opt: Options = {}): Promise<{ ok: true; forecast: Forecast } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  for (const model of MODELS) {
    try {
      const res = await fetcher(forecastUrl(lat, lon, model, opt.base ?? FREE_BASE, opt.apiKey));
      if (!res.ok) { errors.push(`${model}: HTTP ${res.status}`); continue; }
      const f = parseForecast(await res.json(), model, issuedAt);
      if (f) return { ok: true, forecast: f };
      errors.push(`${model}: unusable answer`);
    } catch (e) { errors.push(`${model}: ${e instanceof Error ? e.message : 'failed'}`); }
  }
  return { ok: false, errors };
}

/** The rows for `weather_hourly` / `weather_daily` (0003 + 0005): kind «forecast», the model name as plain data, the cell's elevation. Cloud cover has no column yet (the frost rule needs it: a later migration). */
export function toDbRows(farmId: string, parcelId: string, f: Forecast) {
  const common = { parcel_id: parcelId, farm_id: farmId, kind: 'forecast', issued_at: f.issued_at, model: f.model, cell_elev_m: f.cell_elev_m };
  return {
    hourly: f.hours.map((r) => ({ ...common, at: r.at, temp_c: r.temp_c, rh_pct: r.rh_pct, wind_kmh: r.wind_kmh, gust_kmh: r.gust_kmh, rain_mm: r.rain_mm })),
    daily: f.days.map((r) => ({ ...common, day: r.day, tmin: r.tmin, tmax: r.tmax, rain_mm: r.rain_mm })),
  };
}
