// Edge Function `weather-fetch` — NOT DEPLOYED, NO SCHEDULE (Bora switches it on after the Open-Meteo licence is settled: RUNBOOK §14).
// Only the wiring lives here; the work is in ../_shared/weatherjob.ts (pure, covered by app/tests/unit/weatherjob.test.ts) and the forecast client in ../_shared/openmeteo.ts.
import { runWeatherJob } from '../_shared/weatherjob.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

Deno.serve(async (req) => {
  // only the scheduler / an administrator may call it: the caller must present the project's service key (never a user token)
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!key || !url || req.headers.get('authorization') !== `Bearer ${key}`) return new Response('forbidden', { status: 403 });
  const result = await runWeatherJob({ supabaseUrl: url, serviceKey: key, openMeteoKey: Deno.env.get('OPEN_METEO_API_KEY') }, (u, init) => fetch(u, init), new Date().toISOString());
  return new Response(JSON.stringify(result), { status: result.ok ? 200 : 503, headers: { 'content-type': 'application/json' } });
});
