import { describe, expect, it } from 'vitest';
import { sprayWeather } from '../../src/weather/spray-day';

const day = (date: string, extra: object = {}) => ({ date, tmin: 8, tmax: 17, rain_mm: 0.4, gust_kmh: 31, ...extra });
const rows = [
  { id: 'w1', farm_id: 'f', parcel_id: 'p1', days: [day('2026-11-20'), day('2026-11-21', { tmax: 19 })] },
  { id: 'w2', farm_id: 'f', parcel_id: 'p2', days: [day('2026-11-20', { tmin: 5 })] },
];

describe('weather of the day a spraying was recorded (display only; nothing is stored, nothing is invented)', () => {
  it('uses the stored weather of the parcel for the Athens calendar day of the spraying', () => {
    const r = sprayWeather('2026-11-21T07:30:00.000Z', ['p1'], rows);
    expect(r).toEqual([{ parcel_id: 'p1', weather: { tmin: 8, tmax: 19, rain: 0.4, gust: 31 } }]);
  });
  it('the day is the Athens day: 22:30 UTC on the 20th is already the 21st in Athens', () => {
    expect(sprayWeather('2026-11-20T22:30:00.000Z', ['p1'], rows)[0]?.weather?.tmax).toBe(19);
  });
  it('escape attempts: a day with no stored weather, an unreadable time, or a parcel without weather gives «unknown», never a neighbouring day or another parcel', () => {
    expect(sprayWeather('2026-11-25T09:00:00.000Z', ['p1'], rows)).toEqual([{ parcel_id: 'p1', weather: undefined }]);
    expect(sprayWeather('not a time', ['p1'], rows)).toEqual([{ parcel_id: 'p1', weather: undefined }]);
    expect(sprayWeather('', ['p1'], rows)).toEqual([{ parcel_id: 'p1', weather: undefined }]);
    expect(sprayWeather('2026-11-21T07:30:00.000Z', ['p2'], rows)).toEqual([{ parcel_id: 'p2', weather: undefined }]);
    expect(sprayWeather('2026-11-21T07:30:00.000Z', ['nope'], rows)).toEqual([{ parcel_id: 'nope', weather: undefined }]);
  });
  it('one entry per distinct parcel, in the order given; no parcels gives nothing', () => {
    expect(sprayWeather('2026-11-20T09:00:00.000Z', ['p2', 'p1', 'p2'], rows).map((x) => x.parcel_id)).toEqual(['p2', 'p1']);
    expect(sprayWeather('2026-11-20T09:00:00.000Z', [], rows)).toEqual([]);
  });
});
