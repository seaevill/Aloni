import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runWeatherJob, type JobFetch } from '../../../supabase/functions/_shared/weatherjob';

const sample = JSON.parse(readFileSync(new URL('../../../supabase/functions/_shared/fixtures/openmeteo-icon_eu.sample.json', import.meta.url), 'utf8')) as unknown;
const ENV = { supabaseUrl: 'https://proj.supabase.co', serviceKey: 'SERVICE', openMeteoKey: 'OMKEY' };
const NOW = '2026-11-19T20:00:00.123Z';
const answer = (body: unknown, ok = true): ReturnType<JobFetch> => Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body });
const targets = [{ id: 'p1', farm_id: 'f1', lat: 37.99, lng: 23.35 }, { id: 'p2', farm_id: 'f1', lat: 38.0, lng: 23.4 }, { id: 'bad', farm_id: 'f1', lat: null, lng: null }];

function fake(opts: { failParcel2?: boolean; failStore?: boolean } = {}) {
  const calls: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: string }> = [];
  const fetcher: JobFetch = (url, init) => {
    calls.push({ url, ...init });
    if (url.endsWith('/rpc/weather_targets')) return answer(targets);
    if (url.startsWith('https://customer-api.open-meteo.com/')) return opts.failParcel2 && url.includes('latitude=38.0000') ? answer({}, false) : answer(sample);
    return answer(null, !opts.failStore);
  };
  return { calls, fetcher };
}

describe('the weather job', () => {
  it('without the commercial key it fetches NOTHING (the free API is non-commercial)', async () => {
    const { calls, fetcher } = fake();
    expect(await runWeatherJob({ ...ENV, openMeteoKey: undefined }, fetcher, NOW)).toEqual({ ok: false, reason: 'no_licence_key' });
    expect(await runWeatherJob({ ...ENV, openMeteoKey: '' }, fetcher, NOW)).toEqual({ ok: false, reason: 'no_licence_key' });
    expect(calls).toHaveLength(0);
  });
  it('fetches every parcel that has a position, stores daily and hourly rows with the conflict keys of the table, and sends the service key ONLY to the project', async () => {
    const { calls, fetcher } = fake();
    const r = await runWeatherJob(ENV, fetcher, NOW);
    expect(r).toEqual({ ok: true, issuedAt: '2026-11-19T20:00:00Z', parcels: 2, stored: 2, failed: [] });
    const stores = calls.filter((c) => c.url.includes('/rest/v1/weather_'));
    expect(stores.map((c) => c.url.replace(ENV.supabaseUrl, '')).sort()).toEqual([
      '/rest/v1/weather_daily?on_conflict=parcel_id,day,kind,model,issued_at', '/rest/v1/weather_daily?on_conflict=parcel_id,day,kind,model,issued_at',
      '/rest/v1/weather_hourly?on_conflict=parcel_id,at,kind,model,issued_at', '/rest/v1/weather_hourly?on_conflict=parcel_id,at,kind,model,issued_at']);
    expect(stores[0]!.headers?.prefer).toBe('resolution=merge-duplicates,return=minimal');
    const rows = JSON.parse(stores[0]!.body ?? '[]') as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ parcel_id: 'p1', farm_id: 'f1', kind: 'forecast', model: 'icon_eu', issued_at: '2026-11-19T20:00:00Z' });
    for (const c of calls) if (!c.url.startsWith(ENV.supabaseUrl)) expect(JSON.stringify(c)).not.toContain('SERVICE');   // Open-Meteo never sees the service key
  });
  it('one parcel failing (no forecast, or the store refused) never stops the others and is named', async () => {
    const a = await runWeatherJob(ENV, fake({ failParcel2: true }).fetcher, NOW);
    expect(a).toMatchObject({ ok: true, parcels: 2, stored: 1, failed: ['p2'] });
    const b = await runWeatherJob(ENV, fake({ failStore: true }).fetcher, NOW);
    expect(b).toMatchObject({ ok: true, stored: 0, failed: ['p1', 'p2'] });
  });
  it('when the list of parcels cannot be read it stops and says so', async () => {
    expect(await runWeatherJob(ENV, () => answer(null, false), NOW)).toEqual({ ok: false, reason: 'targets_failed' });
  });
});
