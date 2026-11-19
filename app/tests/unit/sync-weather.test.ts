import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { pullWeather, type Transport } from '../../src/sync/engine';
import { farmDay, parseDays } from '../../src/weather/strip';
import { newDb } from '../helpers/factories';

const base: Omit<Transport, 'weather'> = { applyOps: async () => [], pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), rpc: async () => ({ ok: true }) };
// the shape farm_weather (migration 0029) answers with
const answer = [{ parcel_id: 'p1', days: [{ date: '2026-11-19', tmin: 3, tmax: 11, rain_mm: 2.5, wind_kmh: 18.25, gust_kmh: 41, rh_pct: null, kind: 'forecast', issued_at: '2026-11-19T15:00:00Z' }, { date: '2026-11-20', tmin: 4, tmax: 12, rain_mm: null, wind_kmh: null, gust_kmh: null, rh_pct: null }] }];

describe('the weather comes to the phone', () => {
  it('replaces what the phone had for THIS farm, keeps other farms, and the strip reads the values as stored', async () => {
    const db = await newDb();
    await db.weather.bulkPut([{ id: 'old', farm_id: 'F1', parcel_id: 'old', days: [] }, { id: 'other', farm_id: 'F2', parcel_id: 'other', days: [] }]);
    expect(await pullWeather(db, { ...base, weather: async () => answer }, 'F1', 1_000)).toBe(true);
    expect((await db.weather.where('farm_id').equals('F1').toArray()).map((r) => r.parcel_id)).toEqual(['p1']);
    expect(await db.weather.where('farm_id').equals('F2').count()).toBe(1);
    const days = parseDays((await db.weather.get('p1'))?.days);
    expect(farmDay([days], '2026-11-19')).toMatchObject({ tmin: 3, tmax: 11, rain: 2.5, wind: 18.25, gust: 41, rh: undefined });
    expect(farmDay([days], '2026-11-20')?.rain).toBeUndefined();       // a value the server did not have stays empty, never 0
  });
  it('asks at most every 10 minutes; a failure keeps the old data and does not throw; a server without the function changes nothing', async () => {
    const db = await newDb();
    let calls = 0;
    const tr: Transport = { ...base, weather: async () => { calls += 1; return answer; } };
    expect(await pullWeather(db, tr, 'F3', 0)).toBe(true);
    expect(await pullWeather(db, tr, 'F3', 9 * 60_000)).toBe(false);
    expect(await pullWeather(db, tr, 'F3', 10 * 60_000)).toBe(true);
    expect(calls).toBe(2);
    const failing: Transport = { ...base, weather: async () => { throw new Error('HTTP 500'); } };
    expect(await pullWeather(db, failing, 'F3', 99 * 60_000)).toBe(false);
    expect(await db.weather.where('farm_id').equals('F3').count()).toBe(1);
    expect(await pullWeather(db, base, 'F3', 200 * 60_000)).toBe(false);
  });
});
