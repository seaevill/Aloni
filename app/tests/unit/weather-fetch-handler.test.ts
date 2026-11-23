import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Edge Function wiring (supabase/functions/weather-fetch/index.ts): only the scheduler / an administrator that presents the function's OWN token (≥ 32 characters, WEATHER_CRON_TOKEN) may call it.
// The service key, a short token, a wrong token or no header all get 403 and NOTHING is fetched. The work itself (MET Norway parsing, stale rules, one-parcel dry run) is covered by weatherjob.test.ts and metno.test.ts.
type Handler = (req: Request) => Promise<Response> | Response;
const TOKEN = 'a'.repeat(40);
let handler: Handler;
let env: Record<string, string | undefined>;

beforeEach(async () => {
  env = { SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_URL: 'https://example.supabase.co', WEATHER_CRON_TOKEN: TOKEN };
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => env[k] }, serve: (h: Handler) => { handler = h; } };
  vi.resetModules();
  await import('../../../supabase/functions/weather-fetch/index.ts');
});
afterEach(() => { delete (globalThis as { Deno?: unknown }).Deno; vi.restoreAllMocks(); });

const call = (authorization?: string) => handler(new Request('https://x/functions/v1/weather-fetch', { method: 'POST', headers: authorization === undefined ? {} : { authorization }, body: '{}' }));

describe('weather-fetch: who may call it', () => {
  it('refuses no header, a wrong token, the service key and a token that is not the function\'s own', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    for (const a of [undefined, 'Bearer nope', 'Bearer service-key', `Bearer ${'b'.repeat(40)}`, TOKEN]) expect((await call(a)).status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('refuses everything when the function\'s token is missing or shorter than 32 characters (a misconfigured function never opens)', async () => {
    env.WEATHER_CRON_TOKEN = 'short';
    expect((await call('Bearer short')).status).toBe(403);
    env.WEATHER_CRON_TOKEN = undefined;
    expect((await call('Bearer undefined')).status).toBe(403);
  });
  it('refuses when the project settings are missing', async () => {
    env.SUPABASE_URL = undefined;
    expect((await call(`Bearer ${TOKEN}`)).status).toBe(403);
  });
});
