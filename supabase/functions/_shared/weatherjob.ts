// The weather job (PURE of Deno and of the network: the caller passes `fetcher`): read where to fetch (weather_targets), fetch each parcel from the ONE configured source, store the rows.
// Used by the Edge Function `weather-fetch` (NOT deployed, no schedule: RUNBOOK §14). Covered by app/tests/unit/weatherjob.test.ts with a fake server and recorded-style sample answers.
// The service key goes ONLY to the project's own URL. MET Norway (beta source) needs no key; Open-Meteo needs the commercial key and fetches NOTHING without it.
// A DRY RUN (`dryRun`, optionally one `parcelId`) fetches and parses but writes nothing (no weather rows, no cache state): the owner looks at the answer first.
import { COMMERCIAL_BASE, fetchForecast, toDbRows } from './openmeteo.ts';
import { fetchMetno, userAgent, type Cache } from './weather/sources/metno.ts';
import { UA_VERSION, WEATHER_SOURCE, type SourceId } from './weather/config.ts';
import type { Forecast } from './weather/types.ts';

export interface JobEnv { supabaseUrl: string; serviceKey: string; openMeteoKey: string | undefined }
export interface JobResponse { ok: boolean; status: number; json: () => Promise<unknown>; headers: { get(name: string): string | null } }
export type JobFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<JobResponse>;
export interface JobOptions { dryRun?: boolean; parcelId?: string; source?: SourceId }
export type JobResult =
  | { ok: false; reason: 'no_licence_key' | 'targets_failed' | 'no_such_parcel' }
  | { ok: true; source: SourceId; dryRun: boolean; issuedAt: string; parcels: number; stored: number; notModified: number; skipped: number; failed: string[]; preview: Array<{ parcel: string; model: string; issued_at: string; hours: number; days: Array<{ day: string; tmin: number | null; tmax: number | null; rain_mm: number | null }> }> };

interface Target { id: string; farm_id: string; lat: number; lng: number; last_modified?: string | null; expires?: string | null }
const isTarget = (t: unknown): t is Target => typeof t === 'object' && t !== null && typeof (t as Target).id === 'string' && typeof (t as Target).farm_id === 'string' && typeof (t as Target).lat === 'number' && typeof (t as Target).lng === 'number';

export async function runWeatherJob(env: JobEnv, fetcher: JobFetch, nowIso: string, opts: JobOptions = {}): Promise<JobResult> {
  const source = opts.source ?? WEATHER_SOURCE;
  const dryRun = opts.dryRun === true;
  if (source === 'openmeteo' && !env.openMeteoKey) return { ok: false, reason: 'no_licence_key' };
  const issuedAt = nowIso.replace(/\.\d{3}Z$/, 'Z');
  const headers = { apikey: env.serviceKey, authorization: `Bearer ${env.serviceKey}`, 'content-type': 'application/json' };
  const t = await fetcher(`${env.supabaseUrl}/rest/v1/rpc/weather_targets`, { method: 'POST', headers, body: '{}' });
  if (!t.ok) return { ok: false, reason: 'targets_failed' };
  const list = await t.json();
  let targets = Array.isArray(list) ? list.filter(isTarget) : [];
  if (opts.parcelId !== undefined) { targets = targets.filter((x) => x.id === opts.parcelId); if (targets.length === 0) return { ok: false, reason: 'no_such_parcel' }; }
  const failed: string[] = []; const preview: Array<NonNullable<Extract<JobResult, { ok: true }>['preview']>[number]> = [];
  let stored = 0; let notModified = 0; let skipped = 0;
  const upsert = async (table: string, conflict: string, rows: unknown[]): Promise<boolean> => {
    if (rows.length === 0) return true;
    const r = await fetcher(`${env.supabaseUrl}/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST', headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    return r.ok;
  };
  const saveState = (p: Target, c: Cache) => upsert('weather_fetch_state', 'parcel_id', [{ parcel_id: p.id, farm_id: p.farm_id, last_modified: c.lastModified ?? null, expires: c.expires ?? null, fetched_at: issuedAt }]);
  const store = async (p: Target, f: Forecast): Promise<boolean> => {
    const rows = toDbRows(p.farm_id, p.id, f);
    return (await upsert('weather_daily', 'parcel_id,day,kind,model,issued_at', rows.daily)) && (await upsert('weather_hourly', 'parcel_id,at,kind,model,issued_at', rows.hourly));
  };
  for (const p of targets) {
    try {
      let forecast: Forecast | undefined; let cache: Cache | undefined;
      if (source === 'metno') {
        const r = await fetchMetno(p.lat, p.lng, (url, init) => fetcher(url, init), userAgent(UA_VERSION), nowIso, { lastModified: p.last_modified ?? undefined, expires: p.expires ?? undefined });
        if (!r.ok) { failed.push(p.id); continue; }
        if (r.status === 'skipped') { skipped += 1; continue; }
        if (r.status === 'not_modified') { notModified += 1; if (!dryRun && !(await saveState(p, r.cache))) failed.push(p.id); continue; }
        forecast = r.forecast; cache = r.cache;
      } else {
        const r = await fetchForecast(p.lat, p.lng, (url) => fetcher(url), issuedAt, { base: COMMERCIAL_BASE, apiKey: env.openMeteoKey });
        if (!r.ok) { failed.push(p.id); continue; }
        forecast = r.forecast as Forecast;
      }
      preview.push({ parcel: p.id, model: forecast.model, issued_at: forecast.issued_at, hours: forecast.hours.length, days: forecast.days.map((d) => ({ day: d.day, tmin: d.tmin, tmax: d.tmax, rain_mm: d.rain_mm })) });
      if (dryRun) continue;
      if (await store(p, forecast) && (cache === undefined || (await saveState(p, cache)))) stored += 1; else failed.push(p.id);
    } catch { failed.push(p.id); }   // one parcel's trouble never stops the others
  }
  return { ok: true, source, dryRun, issuedAt, parcels: targets.length, stored, notModified, skipped, failed, preview };
}
