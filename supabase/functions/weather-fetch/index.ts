// Edge Function `weather-fetch` — NOT DEPLOYED, NO CRON (Bora switches it on after the Open-Meteo licence is settled: see _shared/openmeteo.ts).
// What it will do when it is switched on: for every parcel that has a position, fetch the forecast (ICON-EU, fallback IFS HRES), and upsert the rows into weather_hourly / weather_daily with the
// SERVICE role. Everything that can be tested lives in ../_shared/openmeteo.ts (pure, covered by app/tests/unit/openmeteo.test.ts); this file is only the wiring.
import { fetchForecast, toDbRows } from '../_shared/openmeteo.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

Deno.serve(async (req) => {
  // only the scheduler / an administrator may call it: the caller must present the project's service key (never a user token)
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || req.headers.get('authorization') !== `Bearer ${key}`) return new Response('forbidden', { status: 403 });
  const issuedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const apiKey = Deno.env.get('OPEN_METEO_API_KEY');                       // commercial plan key, from the function's environment only
  const base = apiKey ? 'https://customer-api.open-meteo.com/v1/forecast' : undefined;
  const parcels: Array<{ id: string; farm_id: string; lat: number; lon: number }> = [];   // TODO(when switched on): select id, farm_id, lat, lon from parcels where lat is not null (PostGIS point)
  const results = [];
  for (const p of parcels) {
    const r = await fetchForecast(p.lat, p.lon, (url) => fetch(url), issuedAt, { base, apiKey });
    results.push(r.ok ? { parcel: p.id, model: r.forecast.model, rows: toDbRows(p.farm_id, p.id, r.forecast) } : { parcel: p.id, errors: r.errors });
  }
  return new Response(JSON.stringify({ issuedAt, parcels: results.length }), { headers: { 'content-type': 'application/json' } });
});
