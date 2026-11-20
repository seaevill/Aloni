// Edge Function `weather-fetch` — NOT DEPLOYED, NO SCHEDULE (Bora switches it on: RUNBOOK §14). Beta source: MET Norway (no key). Only the wiring lives here; the work is in ../_shared/weatherjob.ts
// (pure, covered by app/tests/unit/weatherjob.test.ts) and the source in ../_shared/weather/sources/. It is called by the scheduler on the SERVER only: a phone never calls it, nor MET.
// A POST body {"dry_run": true, "parcel_id": "<uuid>"} fetches ONE parcel and writes nothing (the owner checks the answer first).
import { runWeatherJob } from '../_shared/weatherjob.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

/** Constant-time comparison (m8 L3): the time it takes does not tell how much of a guess was right. */
function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a); const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  // only the scheduler / an administrator may call it: the caller must present the function's OWN token (WEATHER_CRON_TOKEN, an Edge Function secret; the scheduler reads the same value from Vault) - never the service key, never a user token (m8 S4)
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const token = Deno.env.get('WEATHER_CRON_TOKEN');
  if (!key || !url || !token || token.length < 32 || !sameText(req.headers.get('authorization') ?? '', `Bearer ${token}`)) return new Response('forbidden', { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { dry_run?: unknown; parcel_id?: unknown };
  const result = await runWeatherJob({ supabaseUrl: url, serviceKey: key, openMeteoKey: Deno.env.get('OPEN_METEO_API_KEY') }, (u, init) => fetch(u, init), new Date().toISOString(),
    { dryRun: body.dry_run === true, ...(typeof body.parcel_id === 'string' ? { parcelId: body.parcel_id } : {}) });
  return new Response(JSON.stringify(result), { status: result.ok ? 200 : 503, headers: { 'content-type': 'application/json' } });
});
