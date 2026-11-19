import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { athensWallToUtc, COMMERCIAL_BASE, fetchForecast, forecastUrl, parseForecast, toDbRows, type Fetcher } from '../../../supabase/functions/_shared/openmeteo';

// The sample answers are HAND-WRITTEN in the documented Open-Meteo shape (marked _synthetic): the API is not reachable from the build machine, so nothing here is a recording.
const sample = (n: string): unknown => JSON.parse(readFileSync(new URL(`../../../supabase/functions/_shared/fixtures/openmeteo-${n}.sample.json`, import.meta.url), 'utf8'));
const ok = (body: unknown): ReturnType<Fetcher> => Promise.resolve({ ok: true, status: 200, json: async () => body });
const ISSUED = '2026-11-19T20:00:00Z';

describe('the Open-Meteo request', () => {
  it('asks for ONE model, km/h, mm, the Athens day and 7 days; a key is added only when given', () => {
    const u = new URL(forecastUrl(37.99, 23.35, 'icon_eu'));
    expect(u.origin + u.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ models: 'icon_eu', wind_speed_unit: 'kmh', precipitation_unit: 'mm', timezone: 'Europe/Athens', forecast_days: '7', latitude: '37.9900', longitude: '23.3500' });
    expect(u.searchParams.has('apikey')).toBe(false);
    expect(new URL(forecastUrl(37.99, 23.35, 'ecmwf_ifs', COMMERCIAL_BASE, 'KEY')).searchParams.get('apikey')).toBe('KEY');
  });
});

describe('reading an answer', () => {
  it('Athens wall times become UTC with the right offset in winter (+2) and summer (+3)', () => {
    expect(athensWallToUtc('2026-11-20T10:00')).toBe('2026-11-20T08:00:00Z');
    expect(athensWallToUtc('2026-07-20T10:00')).toBe('2026-07-20T07:00:00Z');
    expect(athensWallToUtc('nonsense')).toBeNull();
  });

  it('keeps a missing value as null (never 0), the cell elevation and the daily sun times', () => {
    const f = parseForecast(sample('icon_eu'), 'icon_eu', ISSUED)!;
    expect(f.hours.map((h) => h.at)).toEqual(['2026-11-19T22:00:00Z', '2026-11-19T23:00:00Z', '2026-11-20T00:00:00Z', '2026-11-20T01:00:00Z']);
    expect(f.hours[3]!.temp_c).toBeNull();
    expect(f.hours[0]).toMatchObject({ temp_c: 3.1, rh_pct: 88, wind_kmh: 3.2, gust_kmh: 7, rain_mm: 0, cloud_pct: 0 });
    expect(f.cell_elev_m).toBe(38);
    expect(f.days[0]).toMatchObject({ day: '2026-11-20', tmin: 1.9, tmax: 14.2, sunrise: '2026-11-20T05:05:00Z', sunset: '2026-11-20T15:12:00Z' });
  });

  it('an answer of the wrong shape, or with no temperature at all, is unusable (not an empty forecast)', () => {
    expect(parseForecast({}, 'icon_eu', ISSUED)).toBeUndefined();
    expect(parseForecast({ hourly: { time: ['2026-11-20T00:00'], temperature_2m: [null] }, daily: { time: [] } }, 'icon_eu', ISSUED)).toBeUndefined();
  });
});

describe('ICON-EU first, IFS HRES as the fallback', () => {
  it('uses ICON-EU when it answers', async () => {
    const urls: string[] = [];
    const r = await fetchForecast(37.99, 23.35, (u) => { urls.push(u); return ok(sample('icon_eu')); }, ISSUED);
    expect(r.ok && r.forecast.model).toBe('icon_eu');
    expect(urls).toHaveLength(1);
  });

  it('falls back to IFS when ICON-EU gives an HTTP error, an unusable answer or throws; both failing names both', async () => {
    const calls: string[] = [];
    const f: Fetcher = (u) => { const model = new URL(u).searchParams.get('models')!; calls.push(model); return model === 'icon_eu' ? Promise.resolve({ ok: false, status: 503, json: async () => ({}) }) : ok(sample('ecmwf_ifs')); };
    const r = await fetchForecast(37.99, 23.35, f, ISSUED);
    expect(r.ok && r.forecast.model).toBe('ecmwf_ifs');
    expect(r.ok && r.forecast.hours[3]!.temp_c).toBe(2);
    expect(calls).toEqual(['icon_eu', 'ecmwf_ifs']);
    const empty = await fetchForecast(37.99, 23.35, (u) => (new URL(u).searchParams.get('models') === 'icon_eu' ? ok({ hourly: { time: [] }, daily: { time: [] } }) : ok(sample('ecmwf_ifs'))), ISSUED);
    expect(empty.ok && empty.forecast.model).toBe('ecmwf_ifs');
    const both = await fetchForecast(37.99, 23.35, () => { throw new Error('offline'); }, ISSUED);
    expect(both).toEqual({ ok: false, errors: ['icon_eu: offline', 'ecmwf_ifs: offline'] });
  });
});

describe('the database rows', () => {
  it('are kind «forecast» with the model name as plain data, the issue time and the cell elevation; nulls stay null', () => {
    const f = parseForecast(sample('icon_eu'), 'icon_eu', ISSUED)!;
    const { hourly, daily } = toDbRows('farm-1', 'parcel-1', f);
    expect(hourly).toHaveLength(4); expect(daily).toHaveLength(2);
    expect(hourly[3]).toEqual({ parcel_id: 'parcel-1', farm_id: 'farm-1', kind: 'forecast', issued_at: ISSUED, model: 'icon_eu', cell_elev_m: 38, at: '2026-11-20T01:00:00Z', temp_c: null, rh_pct: 93, wind_kmh: 2.9, gust_kmh: 6, rain_mm: 0 });
    expect(daily[0]).toMatchObject({ day: '2026-11-20', tmin: 1.9, tmax: 14.2, rain_mm: 0, kind: 'forecast', model: 'icon_eu' });
  });
});
