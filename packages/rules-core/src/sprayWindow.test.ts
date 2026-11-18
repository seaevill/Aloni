import { describe, expect, it } from 'vitest';
import { deltaT, hourReasons, summariseDays, type Hour, type SprayParams, type Sun } from './index';

const P: SprayParams = { windMin: 3, windMax: 10, gustMax: 20, dryBeforeH: 1, rainLookaheadH: 3, rainMaxMm: 0.2, deltaTMin: 2, deltaTMax: 8, tempMax: 28, inversionAfterSunriseH: 2 };
const sun: Record<string, Sun> = { '2026-11-18': { sunrise: '2026-11-18T05:10:00Z', sunset: '2026-11-18T15:07:00Z' } };
// A good afternoon: 6 km/h wind, gusts 12, dry leaves, no rain, 14 °C at 55 % RH (Delta-T about 5)
const BASE: Hour = { time: '', day: '2026-11-18', tempC: 14, rhPct: 55, windKmh: 6, gustKmh: 12, rainMm: 0, cloudOktas: 4, leafWet: false };
type Edit = (h: Hour) => Hour;
const same: Edit = (h) => h;
const good = (h: number, edit: Edit): Hour => edit({ ...BASE, time: `2026-11-18T${String(h).padStart(2, '0')}:00:00Z` });
const run = (edit: Edit, at: number): Hour[] => [8, 9, 10, 11, 12, 13].map((h, i) => good(h, i === at ? edit : same));

describe('SPRAY-WIN hour test: OK only when every condition is positively known', () => {
  it('Delta-T (Stull) is in the expected range for 14 °C / 55 %', () => expect(deltaT(14, 55)).toBeGreaterThan(4));
  it('a good hour is OK', () => expect(hourReasons(run(same, 2), 2, P, sun)).toEqual([]));
  it.each([
    ['wind above the maximum', (h: Hour) => ({ ...h, windKmh: 12 }), 'wind_above_max'], ['wind below the minimum', (h: Hour) => ({ ...h, windKmh: 1 }), 'wind_below_min'], ['gust at the limit', (h: Hour) => ({ ...h, gustKmh: 20 }), 'gust_above_max'],
    ['wet leaves now', (h: Hour) => ({ ...h, leafWet: true }), 'leaves_wet'], ['rain expected in the next hours', (h: Hour) => ({ ...h, rainMm: 1 }), 'rain_expected'], ['too hot', (h: Hour) => ({ ...h, tempC: 30, rhPct: 40 }), 'temp_above_max'],
    ['Delta-T too small (saturated air)', (h: Hour) => ({ ...h, rhPct: 99 }), 'delta_t_out_of_range'],
  ] as const)('%s → not OK', (_n, over, reason) => expect(hourReasons(run(over, 2), 2, P, sun)).toContain(reason));
  it('calm clear evening after sunset is an inversion', () => expect(hourReasons([14, 15, 16, 17, 18, 19].map((h) => good(h, (x) => ({ ...x, windKmh: 1, cloudOktas: 0 }))), 2, P, sun)).toContain('inversion'));
  it('missing, NaN or unreadable data is never OK (and not enough earlier or later hours is not «known dry»)', () => {
    for (const bad of [(h: Hour) => ({ ...h, windKmh: NaN }), (h: Hour) => ({ ...h, tempC: Number.NaN }), (h: Hour) => ({ ...h, rainMm: NaN })]) expect(hourReasons(run(bad, 2), 2, P, sun)).toContain('data_missing' as never);
    expect(hourReasons(run(same, 0), 0, P, sun)).toContain('leaves_wet'); // nothing known before the first hour
    expect(hourReasons(run(same, 5), 5, P, sun)).toContain('rain_expected'); // forecast ends: later hours not known to be dry
    expect(hourReasons(run(same, 2), 2, P, {})).toContain('data_missing'); // no sun times: the inversion test cannot be made
  });
  it('a day with no OK hour is summarised with its reasons', () => {
    const d = summariseDays([8, 9, 10, 11].map((h) => good(h, (x) => ({ ...x, windKmh: 30, gustKmh: 60 }))), P, sun);
    expect(d).toEqual([{ day: '2026-11-18', okHours: 0, reasons: expect.arrayContaining(['wind_above_max', 'gust_above_max']) }]);
  });
  it('MISSING leaf wetness is «data missing», never «dry» (now or in the hours before)', () => {
    const missing = (h: Hour): Hour => ({ ...h, leafWet: undefined });
    expect(hourReasons(run(missing, 2), 2, P, sun)).toEqual(['data_missing']);
    expect(hourReasons(run(missing, 1), 2, P, sun)).toEqual(['data_missing']); // the hour before is unknown, so «dry before» is unknown
    expect(hourReasons(run((h) => ({ ...h, leafWet: true }), 1), 2, P, sun)).toContain('leaves_wet'); // known wet stays «wet»
  });
  it('thresholds that are not usable make EVERY hour «not OK» (a NaN limit never lets an hour pass)', () => {
    const bad: Array<[string, (q: SprayParams) => void]> = [['windMax NaN', (q) => { q.windMax = NaN; }], ['gustMax NaN', (q) => { q.gustMax = Number.NaN; }], ['windMin above windMax', (q) => { q.windMin = 12; }], ['deltaTMin above deltaTMax', (q) => { q.deltaTMin = 9; }],
      ['dryBeforeH fractional', (q) => { q.dryBeforeH = 1.5; }], ['rainLookaheadH 0', (q) => { q.rainLookaheadH = 0; }], ['dryBeforeH negative', (q) => { q.dryBeforeH = -1; }], ['rainMaxMm negative', (q) => { q.rainMaxMm = -0.1; }],
      ['tempMax NaN', (q) => { q.tempMax = NaN; }], ['inversion hours NaN', (q) => { q.inversionAfterSunriseH = NaN; }], ['windMin negative', (q) => { q.windMin = -1; }]];
    for (const [name, edit] of bad) { const q = { ...P }; edit(q); expect(hourReasons(run(same, 2), 2, q, sun), name).toEqual(['params_invalid']); }
    expect(hourReasons(run(same, 2), 2, P, sun)).toEqual([]);
  });
  it('an unreadable hour time, or a series with a gap or out of order around the hour, is «data missing»', () => {
    expect(hourReasons(run((h) => ({ ...h, time: 'Invalid Date' }), 2), 2, P, sun)).toEqual(['data_missing']);
    expect(hourReasons(run((h) => ({ ...h, time: '2026-11-18T11:30:00Z' }), 2), 2, P, sun)).toEqual(['data_missing']); // not on the hour step
    const gap = [8, 9, 11, 12, 13, 14].map((h) => good(h, same)); // the 10:00 hour is missing
    expect(hourReasons(gap, 2, P, sun)).toEqual(['data_missing']);
  });
});
