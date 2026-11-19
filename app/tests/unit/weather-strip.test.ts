import { describe, expect, it } from 'vitest';
import { farmDay, parseDays } from '../../src/weather/strip';

describe('weather strip', () => {
  const a = parseDays([{ date: '2026-11-19', tmin: 9.8, tmax: 20.2, rain_mm: 0, gust_kmh: 18 }, { date: 'x', tmin: 1 }, null, { date: '2026-11-20', tmin: '5' }]);
  const b = parseDays([{ date: '2026-11-19', tmin: 7.1, tmax: 18, rain_mm: 2.4, gust_kmh: 30 }]);
  it('drops entries without a real date and ignores non-numbers', () => {
    expect(a.map((d) => d.date)).toEqual(['2026-11-19', '2026-11-20']);
    expect(a[1]).toEqual({ date: '2026-11-20', tmin: undefined, tmax: undefined, rain: undefined, gust: undefined, wind: undefined, rh: undefined });
  });
  it('the farm day takes the cautious value of every parcel and is empty without data', () => {
    expect(farmDay([a, b], '2026-11-19')).toEqual({ date: '2026-11-19', tmin: 7.1, tmax: 20.2, rain: 2.4, gust: 30, wind: undefined, rh: undefined });
    expect(farmDay([a, b], '2026-11-25')).toBeUndefined();
    expect(farmDay([], '2026-11-19')).toBeUndefined();
  });
});
