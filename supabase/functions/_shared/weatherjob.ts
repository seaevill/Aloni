// The weather job (PURE of Deno and of the network: the caller passes `fetcher`): read where to fetch (weather_targets), fetch each parcel, store the rows. Used by the Edge Function
// `weather-fetch` (NOT deployed, no schedule: RUNBOOK §14). Covered by app/tests/unit/weatherjob.test.ts with a fake server.
// The service key goes ONLY to the project's own URL. Without the commercial Open-Meteo key NOTHING is fetched (the free API is non-commercial: see openmeteo.ts).
import { COMMERCIAL_BASE, fetchForecast, toDbRows } from './openmeteo.ts';

export interface JobEnv { supabaseUrl: string; serviceKey: string; openMeteoKey: string | undefined }
export type JobFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
export type JobResult = { ok: false; reason: 'no_licence_key' | 'targets_failed' } | { ok: true; issuedAt: string; parcels: number; stored: number; failed: string[] };

interface Target { id: string; farm_id: string; lat: number; lng: number }
const isTarget = (t: unknown): t is Target => typeof t === 'object' && t !== null && typeof (t as Target).id === 'string' && typeof (t as Target).farm_id === 'string' && typeof (t as Target).lat === 'number' && typeof (t as Target).lng === 'number';

export async function runWeatherJob(env: JobEnv, fetcher: JobFetch, nowIso: string): Promise<JobResult> {
  if (!env.openMeteoKey) return { ok: false, reason: 'no_licence_key' };
  const issuedAt = nowIso.replace(/\.\d{3}Z$/, 'Z');
  const headers = { apikey: env.serviceKey, authorization: `Bearer ${env.serviceKey}`, 'content-type': 'application/json' };
  const t = await fetcher(`${env.supabaseUrl}/rest/v1/rpc/weather_targets`, { method: 'POST', headers, body: '{}' });
  if (!t.ok) return { ok: false, reason: 'targets_failed' };
  const list = await t.json();
  const targets = Array.isArray(list) ? list.filter(isTarget) : [];
  const failed: string[] = [];
  let stored = 0;
  const upsert = async (table: string, conflict: string, rows: unknown[]): Promise<boolean> => {
    if (rows.length === 0) return true;
    const r = await fetcher(`${env.supabaseUrl}/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST', headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    return r.ok;
  };
  for (const p of targets) {
    try {
      const f = await fetchForecast(p.lat, p.lng, (url) => fetcher(url), issuedAt, { base: COMMERCIAL_BASE, apiKey: env.openMeteoKey });
      if (!f.ok) { failed.push(p.id); continue; }
      const rows = toDbRows(p.farm_id, p.id, f.forecast);
      const a = await upsert('weather_daily', 'parcel_id,day,kind,model,issued_at', rows.daily);
      const b = await upsert('weather_hourly', 'parcel_id,at,kind,model,issued_at', rows.hourly);
      if (a && b) stored += 1; else failed.push(p.id);
    } catch { failed.push(p.id); }   // one parcel's trouble never stops the others
  }
  return { ok: true, issuedAt, parcels: targets.length, stored, failed };
}
