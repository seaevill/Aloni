import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runWeatherJob, type JobFetch, type JobResponse } from '../../../supabase/functions/_shared/weatherjob';

const read = (n: string): unknown => JSON.parse(readFileSync(new URL(`../../../supabase/functions/_shared/fixtures/${n}`, import.meta.url), 'utf8'));
const metno = read('metno-complete.sample.json'); const icon = read('openmeteo-icon_eu.sample.json');
const ENV = { supabaseUrl: 'https://proj.supabase.co', serviceKey: 'SERVICE', openMeteoKey: undefined as string | undefined };
const NOW = '2026-11-19T20:00:00.123Z';
const answer = (body: unknown, ok = true, headers: Record<string, string> = {}, status = ok ? 200 : 500): ReturnType<JobFetch> => Promise.resolve({ ok, status, json: async () => body, headers: { get: (n) => headers[n.toLowerCase()] ?? null } } satisfies JobResponse);
type Target = { id: string; farm_id: string; lat: number | null; lng: number | null; last_modified?: string | null; expires?: string | null };
const targets: Target[] = [{ id: 'p1', farm_id: 'f1', lat: 37.99, lng: 23.35 }, { id: 'p2', farm_id: 'f1', lat: 38.0, lng: 23.4 }, { id: 'bad', farm_id: 'f1', lat: null, lng: null }];

function fake(opts: { failParcel2?: boolean; failStore?: boolean; targets?: Target[]; notModified?: boolean } = {}) {
  const calls: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: string }> = [];
  const fetcher: JobFetch = (url, init) => {
    calls.push({ url, ...init });
    if (url.endsWith('/rpc/weather_targets')) return answer(opts.targets ?? targets);
    if (url.startsWith('https://api.met.no/')) {
      if (opts.failParcel2 && url.includes('lat=38&')) return answer({}, false);
      return opts.notModified ? answer(null, false, { expires: 'Fri, 20 Nov 2026 02:00:00 GMT' }, 304) : answer(metno, true, { expires: 'Fri, 20 Nov 2026 02:00:00 GMT', 'last-modified': 'Thu, 19 Nov 2026 19:40:00 GMT' });
    }
    if (url.startsWith('https://customer-api.open-meteo.com/')) return answer(icon);
    return answer(null, !opts.failStore);
  };
  return { calls, fetcher };
}
const stores = (calls: Array<{ url: string }>) => calls.filter((c) => c.url.includes('/rest/v1/weather_')).map((c) => c.url.replace(ENV.supabaseUrl, ''));

describe('the weather job, MET Norway (the beta source)', () => {
  it('needs NO key: fetches each parcel that has a position, stores daily + hourly rows and the cache state, with the User-Agent, and sends the service key ONLY to the project', async () => {
    const { calls, fetcher } = fake();
    const r = await runWeatherJob(ENV, fetcher, NOW);
    expect(r).toMatchObject({ ok: true, source: 'metno', dryRun: false, issuedAt: '2026-11-19T20:00:00Z', parcels: 2, stored: 2, notModified: 0, skipped: 0, failed: [] });
    expect(stores(calls).sort()).toEqual([
      '/rest/v1/weather_daily?on_conflict=parcel_id,day,kind,model,issued_at', '/rest/v1/weather_daily?on_conflict=parcel_id,day,kind,model,issued_at',
      '/rest/v1/weather_fetch_state?on_conflict=parcel_id', '/rest/v1/weather_fetch_state?on_conflict=parcel_id',
      '/rest/v1/weather_hourly?on_conflict=parcel_id,at,kind,model,issued_at', '/rest/v1/weather_hourly?on_conflict=parcel_id,at,kind,model,issued_at']);
    const met = calls.filter((c) => c.url.startsWith('https://api.met.no/'));
    expect(met).toHaveLength(2); for (const c of met) expect(c.headers?.['user-agent']).toBe('Aloni/0.0.0 https://github.com/seaevill/Aloni');
    const hourly = JSON.parse(calls.find((c) => c.url.includes('/weather_hourly'))!.body ?? '[]') as Array<Record<string, unknown>>;
    expect(hourly[0]).toMatchObject({ parcel_id: 'p1', farm_id: 'f1', kind: 'forecast', model: 'metno', issued_at: '2026-11-19T14:40:00Z' }); expect(hourly[0]).toHaveProperty('dewpoint_c');
    const state = JSON.parse(calls.find((c) => c.url.includes('/weather_fetch_state'))!.body ?? '[]') as Array<Record<string, unknown>>;
    expect(state[0]).toMatchObject({ parcel_id: 'p1', expires: 'Fri, 20 Nov 2026 02:00:00 GMT', last_modified: 'Thu, 19 Nov 2026 19:40:00 GMT' });
    for (const c of calls) if (!c.url.startsWith(ENV.supabaseUrl)) expect(JSON.stringify(c)).not.toContain('SERVICE');
  });
  it('a parcel whose «Expires» is still ahead is not requested at all; a 304 stores only the cache state', async () => {
    const early = fake({ targets: [{ ...targets[0]!, expires: '2026-11-19T21:00:00Z', last_modified: 'L' }] });
    expect(await runWeatherJob(ENV, early.fetcher, NOW)).toMatchObject({ ok: true, skipped: 1, stored: 0 });
    expect(early.calls.some((c) => c.url.startsWith('https://api.met.no/'))).toBe(false);
    const nm = fake({ notModified: true, targets: [{ ...targets[0]!, expires: '2026-11-19T19:00:00Z', last_modified: 'Thu, 19 Nov 2026 19:40:00 GMT' }] });
    expect(await runWeatherJob(ENV, nm.fetcher, NOW)).toMatchObject({ ok: true, notModified: 1, stored: 0, failed: [] });
    expect(nm.calls.find((c) => c.url.startsWith('https://api.met.no/'))?.headers?.['if-modified-since']).toBe('Thu, 19 Nov 2026 19:40:00 GMT');
    expect(stores(nm.calls)).toEqual(['/rest/v1/weather_fetch_state?on_conflict=parcel_id']);
  });
  it('a DRY RUN of one parcel fetches and shows the answer but writes NOTHING', async () => {
    const { calls, fetcher } = fake();
    const r = await runWeatherJob(ENV, fetcher, NOW, { dryRun: true, parcelId: 'p1' });
    expect(r).toMatchObject({ ok: true, dryRun: true, parcels: 1, stored: 0 });
    if (r.ok) { expect(r.preview).toHaveLength(1); expect(r.preview[0]).toMatchObject({ parcel: 'p1', model: 'metno', issued_at: '2026-11-19T14:40:00Z' }); expect(r.preview[0]!.days.length).toBeGreaterThan(0); }
    expect(stores(calls)).toEqual([]); expect(calls.filter((c) => c.url.startsWith('https://api.met.no/'))).toHaveLength(1);
    expect(await runWeatherJob(ENV, fetcher, NOW, { dryRun: true, parcelId: 'nope' })).toEqual({ ok: false, reason: 'no_such_parcel' });
  });
  it('one parcel failing never stops the others and is named; a refused store counts as failed', async () => {
    expect(await runWeatherJob(ENV, fake({ failParcel2: true }).fetcher, NOW)).toMatchObject({ ok: true, parcels: 2, stored: 1, failed: ['p2'] });
    expect(await runWeatherJob(ENV, fake({ failStore: true }).fetcher, NOW)).toMatchObject({ ok: true, stored: 0, failed: ['p1', 'p2'] });
  });
  it('when the list of parcels cannot be read it stops and says so', async () => { expect(await runWeatherJob(ENV, () => answer(null, false), NOW)).toEqual({ ok: false, reason: 'targets_failed' }); });
});

describe('the other source (Open-Meteo) comes later: it needs the paid key and fetches nothing without it', () => {
  it('without the key nothing is fetched; with it the same rows are stored', async () => {
    const a = fake(); expect(await runWeatherJob(ENV, a.fetcher, NOW, { source: 'openmeteo' })).toEqual({ ok: false, reason: 'no_licence_key' }); expect(a.calls).toHaveLength(0);
    const b = fake(); expect(await runWeatherJob({ ...ENV, openMeteoKey: 'OMKEY' }, b.fetcher, NOW, { source: 'openmeteo' })).toMatchObject({ ok: true, source: 'openmeteo', stored: 2 });
  });
});
