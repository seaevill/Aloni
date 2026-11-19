// Edge Function `weather-fetch` — NOT DEPLOYED, NO SCHEDULE (Bora switches it on: RUNBOOK §14). Beta source: MET Norway (no key). Only the wiring lives here; the work is in ../_shared/weatherjob.ts
// (pure, covered by app/tests/unit/weatherjob.test.ts) and the source in ../_shared/weather/sources/. It is called by the scheduler on the SERVER only: a phone never calls it, nor MET.
// A POST body {"dry_run": true, "parcel_id": "<uuid>"} fetches ONE parcel and writes nothing (the owner checks the answer first).
import { runWeatherJob } from '../_shared/weatherjob.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

Deno.serve(async (req) => {
  // only the scheduler / an administrator may call it: the caller must present the project's service key (never a user token)
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!key || !url || req.headers.get('authorization') !== `Bearer ${key}`) return new Response('forbidden', { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { dry_run?: unknown; parcel_id?: unknown };
  const result = await runWeatherJob({ supabaseUrl: url, serviceKey: key, openMeteoKey: Deno.env.get('OPEN_METEO_API_KEY') }, (u, init) => fetch(u, init), new Date().toISOString(),
    { dryRun: body.dry_run === true, ...(typeof body.parcel_id === 'string' ? { parcelId: body.parcel_id } : {}) });
  return new Response(JSON.stringify(result), { status: result.ok ? 200 : 503, headers: { 'content-type': 'application/json' } });
});
