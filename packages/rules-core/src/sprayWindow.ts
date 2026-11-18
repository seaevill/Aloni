import { parseInstant } from './waits';

// SPRAY-WIN, the hour test. PURE and conservative: an hour is OK only when EVERY condition is positively known to hold; a missing or unreadable value
// (NaN, not enough hours before/after) makes the hour «not OK», never «OK». The numbers are [SET] thresholds: until they are signed the rule only shows data.

export interface Hour { time: string; day: string; tempC: number; rhPct: number; windKmh: number; gustKmh: number; rainMm: number; cloudOktas: number; /** undefined = not measured/estimated = UNKNOWN (never «dry») */ leafWet: boolean | undefined }
export interface Sun { sunrise: string; sunset: string }
export interface SprayParams {
  windMin: number; windMax: number; gustMax: number; dryBeforeH: number; rainLookaheadH: number; rainMaxMm: number; deltaTMin: number; deltaTMax: number; tempMax: number; inversionAfterSunriseH: number;
}
export type Reason = 'data_missing' | 'wind_above_max' | 'wind_below_min' | 'gust_above_max' | 'leaves_wet' | 'rain_expected' | 'delta_t_out_of_range' | 'temp_above_max' | 'inversion' | 'params_invalid';

const finite = (...xs: number[]) => xs.every((x) => Number.isFinite(x));

/** The thresholds must be usable numbers in a sensible order: with a NaN limit every comparison is false and an hour would slip through as «OK». */
export function paramsValid(p: SprayParams): boolean {
  return finite(p.windMin, p.windMax, p.gustMax, p.dryBeforeH, p.rainLookaheadH, p.rainMaxMm, p.deltaTMin, p.deltaTMax, p.tempMax, p.inversionAfterSunriseH)
    && p.windMin >= 0 && p.windMin <= p.windMax && p.gustMax >= 0 && p.rainMaxMm >= 0 && p.deltaTMin <= p.deltaTMax && p.inversionAfterSunriseH >= 0
    && Number.isInteger(p.dryBeforeH) && p.dryBeforeH >= 0 && Number.isInteger(p.rainLookaheadH) && p.rainLookaheadH >= 1;
}
const stamp = (t: string): number | undefined => { const r = parseInstant(t); return r.known ? r.value.day * 86400 + r.value.sec : undefined; };
/** Two neighbouring hours must be exactly one hour apart; anything else (a gap, a repeat, an unsorted series, an unreadable time) is not a series we can judge. */
const oneHourApart = (a: Hour, b: Hour): boolean => { const x = stamp(a.time); const y = stamp(b.time); return x !== undefined && y !== undefined && y - x === 3600; };

/** Stull (2011) wet-bulb temperature from temperature (°C) and relative humidity (%), and Delta-T = T − Tw. */
export function deltaT(tempC: number, rhPct: number): number {
  const wet = tempC * Math.atan(0.151977 * Math.sqrt(rhPct + 8.313659)) + Math.atan(tempC + rhPct) - Math.atan(rhPct - 1.676331) + 0.00391838 * rhPct ** 1.5 * Math.atan(0.023101 * rhPct) - 4.686035;
  return tempC - wet;
}

/** Why hour `i` of a parcel's series is not OK (empty = OK). `sun` maps a local day to its sunrise / sunset instants (UTC seconds strings). */
export function hourReasons(hours: readonly Hour[], i: number, p: SprayParams, sun: Readonly<Record<string, Sun>>): Reason[] {
  if (!paramsValid(p)) return ['params_invalid'];
  const h = hours[i];
  if (!h || !finite(h.tempC, h.rhPct, h.windKmh, h.gustKmh, h.rainMm, h.cloudOktas) || stamp(h.time) === undefined) return ['data_missing'];
  const around = hours.slice(Math.max(0, i - p.dryBeforeH), Math.min(hours.length, i + p.rainLookaheadH));
  if (!around.every((x, k) => k === 0 || oneHourApart(around[k - 1], x))) return ['data_missing']; // a gap or a disorder in the hours that count
  if (h.leafWet === undefined || hours.slice(Math.max(0, i - p.dryBeforeH), i).some((b) => b.leafWet === undefined)) return ['data_missing']; // unknown wetness is not «dry»
  const why: Reason[] = [];
  if (h.windKmh > p.windMax) why.push('wind_above_max');
  if (h.windKmh < p.windMin) why.push('wind_below_min');
  if (h.gustKmh >= p.gustMax) why.push('gust_above_max');
  const before = hours.slice(Math.max(0, i - p.dryBeforeH), i);
  if (i < p.dryBeforeH || before.some((b) => b.leafWet) || h.leafWet) why.push('leaves_wet'); // not enough earlier hours = not known to be dry
  const ahead = hours.slice(i, i + p.rainLookaheadH);
  if (ahead.length < p.rainLookaheadH || !finite(...ahead.map((a) => a.rainMm)) || ahead.reduce((a, b) => a + b.rainMm, 0) > p.rainMaxMm) why.push('rain_expected'); // beyond the forecast = not known to be dry
  const dt = deltaT(h.tempC, h.rhPct);
  if (!(dt >= p.deltaTMin && dt <= p.deltaTMax)) why.push('delta_t_out_of_range');
  if (h.tempC > p.tempMax) why.push('temp_above_max');
  const s = sun[h.day];
  if (!s) why.push('data_missing'); // without sun times the inversion test cannot be made
  else if (h.windKmh < p.windMin && h.cloudOktas <= 2 && (h.time >= s.sunset || h.time < laterBy(s.sunrise, p.inversionAfterSunriseH))) why.push('inversion');
  return why;
}

/** `instant` + whole hours, for «YYYY-MM-DDTHH:MM:SSZ» strings (hours stay inside the day arithmetic the caller needs: only used for the sunrise offset). */
function laterBy(instant: string, hours: number): string {
  const [date, time] = instant.split('T');
  const [h, m, s] = time.replace('Z', '').split(':');
  const hh = parseFloat(h) + hours;
  return hh < 24 ? `${date}T${String(hh).padStart(2, '0')}:${m}:${s}Z` : `${date}T23:59:59Z`;
}

export interface DaySummary { day: string; okHours: number; reasons: Reason[] }
export function summariseDays(hours: readonly Hour[], p: SprayParams, sun: Readonly<Record<string, Sun>>): DaySummary[] {
  const days = [...new Set(hours.map((h) => h.day))];
  return days.map((day) => {
    const idx = hours.map((h, i) => (h.day === day ? i : -1)).filter((i) => i >= 0);
    const all = idx.map((i) => hourReasons(hours, i, p, sun));
    return { day, okHours: all.filter((r) => r.length === 0).length, reasons: [...new Set(all.flat())] };
  });
}
