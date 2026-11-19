import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { athensDayHour, coord, fetchMetno, metUrl, msToKmh, parseMetno, userAgent, type MetFetch } from '../../../supabase/functions/_shared/weather/sources/metno';
import { STALE_AFTER_HOURS, UA_VERSION, WEATHER_SOURCE } from '../../../supabase/functions/_shared/weather/config';

// The sample answer is HAND-WRITTEN in the documented Locationforecast 2.0 «complete» shape (marked _synthetic): MET is not reachable from the build machine, so nothing here is a recording.
type Sample = { properties: { timeseries: Array<{ time: string; data: { instant: { details: Record<string, number> }; next_1_hours?: { details: { precipitation_amount: number } } } }> } };
const sample = JSON.parse(readFileSync(new URL('../../../supabase/functions/_shared/fixtures/metno-complete.sample.json', import.meta.url), 'utf8')) as Sample;
const NOW = '2026-11-19T15:00:00.000Z';
const res = (status: number, body: unknown, headers: Record<string, string> = {}): MetFetch => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: (n) => headers[n.toLowerCase()] ?? null } });

describe('units and places', () => {
  it('wind: m/s → km/h, two decimals, a missing value stays missing (never 0)', () => {
    expect(msToKmh(5)).toBe(18); expect(msToKmh(1.1)).toBe(3.96); expect(msToKmh(0)).toBe(0); expect(msToKmh(2.7778)).toBe(10); expect(msToKmh(33.3)).toBe(119.88); expect(msToKmh(null)).toBeNull();
  });
  it('coordinates have at most 4 decimals; the URL is the «complete» endpoint', () => {
    expect(coord(37.9912345)).toBe('37.9912'); expect(coord(23.35)).toBe('23.35'); expect(coord(-0.00004)).toBe('0');
    expect(metUrl(37.9912345, 23.3500001)).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=37.9912&lon=23.35');
    for (const n of new URL(metUrl(37.123456789, 23.987654321)).searchParams.values()) expect((n.split('.')[1] ?? '').length).toBeLessThanOrEqual(4);
  });
  it('Athens clock: winter +2, summer +3, a day boundary', () => {
    expect(athensDayHour('2026-11-19T22:00:00Z')).toEqual({ day: '2026-11-20', hour: 0 });
    expect(athensDayHour('2026-07-20T21:30:00Z')).toEqual({ day: '2026-07-21', hour: 0 });
    expect(athensDayHour('nonsense')).toBeUndefined();
  });
  it('the User-Agent names the app, its version and the repository, and holds no e-mail; the version equals the app\'s', () => {
    const ua = userAgent(UA_VERSION);
    expect(ua).toBe('Aloni/0.0.0 https://github.com/seaevill/Aloni'); expect(ua).not.toContain('@');
    expect(UA_VERSION).toBe((JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version);
  });
  it('the beta source is MET Norway; the stale limit is 12 hours', () => { expect(WEATHER_SOURCE).toBe('metno'); expect(STALE_AFTER_HOURS).toBe(12); });
});

describe('reading an answer', () => {
  const f = parseMetno(sample, 'fallback')!;
  it('every point becomes an hour in UTC with the same fields whatever the source: °C, dew point, %, km/h, mm', () => {
    expect(f.hours).toHaveLength(sample.properties.timeseries.length);
    const p0 = sample.properties.timeseries[0]!; const h0 = f.hours[0]!;
    expect(h0.at).toBe('2026-11-19T15:00:00Z'); expect(h0.temp_c).toBe(p0.data.instant.details.air_temperature); expect(h0.dewpoint_c).toBe(p0.data.instant.details.dew_point_temperature);
    expect(h0.rh_pct).toBe(p0.data.instant.details.relative_humidity); expect(h0.wind_kmh).toBe(msToKmh(p0.data.instant.details.wind_speed)); expect(h0.gust_kmh).toBe(msToKmh(p0.data.instant.details.wind_speed_of_gust ?? null));
    expect(h0.rain_mm).toBe(p0.data.next_1_hours?.details.precipitation_amount);
  });
  it('a gust MET did not give is null; rain without a next_1_hours block (the 6-hourly stretch) is null, not spread', () => {
    const noGust = sample.properties.timeseries.findIndex((e) => e.data.instant.details.wind_speed_of_gust === undefined);
    expect(noGust).toBeGreaterThanOrEqual(0); expect(f.hours[noGust]!.gust_kmh).toBeNull();
    expect(f.hours.at(-1)!.rain_mm).toBeNull();
  });
  it('the time of the data is MET\'s «updated_at»; the height of the point is kept', () => { expect(f.issued_at).toBe('2026-11-19T14:40:00Z'); expect(f.cell_elev_m).toBe(12); expect(f.model).toBe('metno'); });
  it('days are Athens days; a partial first day and a 6-hourly day show no invented totals', () => {
    const d = Object.fromEntries(f.days.map((x) => [x.day, x]));
    expect(d['2026-11-19']!.tmin).not.toBeNull(); expect(d['2026-11-19']!.rain_mm).toBeNull();          // 7 hourly points left of today: min / max of those, no rain total
    const day20 = f.hours.filter((h) => athensDayHour(h.at)!.day === '2026-11-20');
    expect(day20).toHaveLength(24);
    expect(d['2026-11-20']!.tmin).toBe(Math.min(...day20.map((h) => h.temp_c!))); expect(d['2026-11-20']!.tmax).toBe(Math.max(...day20.map((h) => h.temp_c!)));
    expect(d['2026-11-20']!.rain_mm).toBe(Number(day20.reduce((a, h) => a + h.rain_mm!, 0).toFixed(2)));
    expect(d['2026-11-23']!.tmin).toBeNull(); expect(d['2026-11-23']!.tmax).toBeNull(); expect(d['2026-11-23']!.rain_mm).toBeNull();
  });
  it('an unusable answer is refused', () => { for (const bad of [null, {}, { properties: {} }, { properties: { timeseries: [] } }, { properties: { timeseries: [{ time: 'x', data: {} }] } }]) expect(parseMetno(bad, 'x')).toBeUndefined(); });
});

describe('asking MET politely', () => {
  const UA = userAgent(UA_VERSION);
  it('before «Expires» NOTHING is requested', async () => {
    let calls = 0;
    const r = await fetchMetno(37.99, 23.35, async () => { calls += 1; return res(200, sample); }, UA, NOW, { lastModified: 'x', expires: '2026-11-19T16:00:00Z' });
    expect(r).toMatchObject({ ok: true, status: 'skipped' }); expect(calls).toBe(0);
  });
  it('after it, the request names the app and carries If-Modified-Since; a 304 only moves the expiry', async () => {
    let seen: Record<string, string> = {}; let url = '';
    const r = await fetchMetno(37.9912345, 23.35, async (u, init) => { url = u; seen = init.headers; return res(304, null, { expires: 'Thu, 19 Nov 2026 17:00:00 GMT', 'last-modified': 'Thu, 19 Nov 2026 14:40:00 GMT' }); }, UA, NOW, { lastModified: 'Thu, 19 Nov 2026 14:40:00 GMT', expires: '2026-11-19T14:00:00Z' });
    expect(seen['user-agent']).toBe('Aloni/0.0.0 https://github.com/seaevill/Aloni'); expect(seen['if-modified-since']).toBe('Thu, 19 Nov 2026 14:40:00 GMT'); expect(url).toContain('lat=37.9912&');
    expect(r).toEqual({ ok: true, status: 'not_modified', cache: { lastModified: 'Thu, 19 Nov 2026 14:40:00 GMT', expires: 'Thu, 19 Nov 2026 17:00:00 GMT' } });
  });
  it('a first request has no If-Modified-Since; a 200 is parsed and its Expires / Last-Modified are kept', async () => {
    let seen: Record<string, string> = {};
    const r = await fetchMetno(37.99, 23.35, async (_u, init) => { seen = init.headers; return res(200, sample, { expires: 'E', 'last-modified': 'L' }); }, UA, NOW);
    expect(seen['if-modified-since']).toBeUndefined();
    expect(r).toMatchObject({ ok: true, status: 'fresh', cache: { lastModified: 'L', expires: 'E' } });
  });
  it('an HTTP error, an unusable answer and a network failure are errors that say so', async () => {
    expect(await fetchMetno(1, 2, async () => res(503, null), UA, NOW)).toEqual({ ok: false, error: 'HTTP 503' });
    expect(await fetchMetno(1, 2, async () => res(200, {}), UA, NOW)).toEqual({ ok: false, error: 'unusable answer' });
    expect(await fetchMetno(1, 2, async () => { throw new Error('offline'); }, UA, NOW)).toEqual({ ok: false, error: 'offline' });
  });
});
