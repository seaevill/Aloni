import { describe, expect, it } from 'vitest';
import { shiftWeather } from '../../src/db/demo-weather';

// Demo weather is fictional and has fixed dates (9–22 Nov 2026, «today» = 17 Nov). It is moved as a whole so the prototype's «today» is the real today: the Demo then always has today and the next five days filled, never «άγνωστο» because the calendar moved on.
const days = [
  { date: '2026-11-16', tmin: 9, tmax: 18, rain_mm: 0, kind: 'forecast' },
  { date: '2026-11-17', tmin: 1.5, tmax: 16.7, rain_mm: 0.4, kind: 'forecast' },
  { date: '2026-11-18', tmin: 2, tmax: 15, rain_mm: 12, kind: 'forecast' },
];

describe('shiftWeather', () => {
  it('moves every date by the same number of days; nothing else changes (values are copied exactly)', () => {
    const out = shiftWeather(days, '2026-11-17', '2026-12-01');
    expect(out.map((d) => d.date)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    expect(out.map(({ date: _d, ...rest }) => rest)).toEqual(days.map(({ date: _d, ...rest }) => rest));
  });
  it('the prototype today lands on the real today, across a month and a year end, and backwards too', () => {
    expect(shiftWeather(days, '2026-11-17', '2027-01-01')[1]!.date).toBe('2027-01-01');
    expect(shiftWeather(days, '2026-11-17', '2026-11-10')[1]!.date).toBe('2026-11-10');
  });
  it('the same day = the same data; an unreadable date is kept as it is (never invented)', () => {
    expect(shiftWeather(days, '2026-11-17', '2026-11-17')).toEqual(days);
    expect(shiftWeather([{ date: 'soon', kind: 'forecast' }], '2026-11-17', '2026-12-01')).toEqual([{ date: 'soon', kind: 'forecast' }]);
  });
});
