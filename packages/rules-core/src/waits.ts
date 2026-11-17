import { known, unknown, type Known } from './known';
import type { PhiDays, ReiHours } from './label';

// Waiting periods (PHI days, REI hours): from the moment of spraying to the moment the wait ends. Pure integer arithmetic on UTC seconds:
// no clock, no Date, no rounding. A wait that cannot be computed is UNKNOWN (= blocked); it is never «over».

const DAY = 86_400;
const pad = (n: number, w: number) => String(n).padStart(w, '0');
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthLength = (y: number, m: number) => (m === 2 && leap(y) ? 29 : DAYS_IN_MONTH[m - 1]);

/** «2026-02-31», «2026-13-01», «Invalid Date» are not dates. */
export function isCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  return y >= 1970 && mo >= 1 && mo <= 12 && d >= 1 && d <= monthLength(y, mo);
}

function daysFromCivil(y: number, m: number, d: number): number { // days since 1970-01-01 (proleptic Gregorian)
  let days = 0;
  for (let yy = 1970; yy < y; yy += 1) days += leap(yy) ? 366 : 365;
  for (let mm = 1; mm < m; mm += 1) days += monthLength(y, mm);
  return days + d - 1;
}

/** A UTC instant as whole days since 1970-01-01 and seconds into that day (0..86399): no division or rounding anywhere. */
export interface Instant { day: number; sec: number }

/** `YYYY-MM-DDTHH:MM:SSZ` (UTC); anything else, or an impossible date or clock time, is unknown. */
export function parseInstant(s: string): Known<Instant> {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(s);
  if (!m || !isCalendarDate(m[1])) return unknown('invalid');
  const [h, mi, se] = [parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
  if (h > 23 || mi > 59 || se > 59) return unknown('invalid');
  const [y, mo, d] = m[1].split('-').map((p) => parseFloat(p));
  return known({ day: daysFromCivil(y, mo, d), sec: h * 3600 + mi * 60 + se });
}

export function formatInstant(at: Instant): string {
  let days = at.day;
  let y = 1970;
  while (days >= (leap(y) ? 366 : 365)) { days -= leap(y) ? 366 : 365; y += 1; }
  let mo = 1;
  while (days >= monthLength(y, mo)) { days -= monthLength(y, mo); mo += 1; }
  let [h, mi, se] = [0, 0, at.sec];
  while (se >= 3600) { se -= 3600; h += 1; }
  while (se >= 60) { se -= 60; mi += 1; }
  return `${pad(y, 4)}-${pad(mo, 2)}-${pad(days + 1, 2)}T${pad(h, 2)}:${pad(mi, 2)}:${pad(se, 2)}Z`;
}

/** start + whole days + whole seconds, carried exactly (the seconds only ever grow the time). */
function add(start: Instant, days: number, seconds: number): Instant {
  let [day, sec] = [start.day + days, start.sec + seconds];
  while (sec >= DAY) { sec -= DAY; day += 1; }
  return { day, sec };
}

const endOf = (sprayedAt: string, days: Known<number>, seconds: Known<number>): Known<string> => {
  const start = parseInstant(sprayedAt);
  if (!start.known) return start;
  if (!days.known) return days;
  return seconds.known ? known(formatInstant(add(start.value, days.value, seconds.value))) : seconds;
};

/** Pre-harvest interval: spraying time + exactly `phi` × 24 h. Unknown PHI or an invalid time → unknown (blocked). */
export const phiEnd = (sprayedAt: string, phi: Known<PhiDays>): Known<string> => endOf(sprayedAt, phi, known(0));

/** Re-entry interval: spraying time + exactly `rei` hours. Unknown REI or an invalid time → unknown (blocked). */
export const reiEnd = (sprayedAt: string, rei: Known<ReiHours>): Known<string> => endOf(sprayedAt, known(0), rei.known ? known(rei.value * 3600) : rei);

/** «Over» only when the end is known, `now` is a real instant and `now` is strictly after the end. Everything else is NOT over. */
export function waitOver(now: string, end: Known<string>): boolean {
  const n = parseInstant(now);
  const e = end.known ? parseInstant(end.value) : end;
  if (!n.known || !e.known) return false;
  return n.value.day !== e.value.day ? n.value.day > e.value.day : n.value.sec > e.value.sec;
}

/** A real calendar date plus whole days → the new date (`YYYY-MM-DD`). Not a real date → unknown. */
export function dateAfterDays(date: string, days: number): Known<string> {
  const start = parseInstant(`${date}T00:00:00Z`);
  return start.known ? known(formatInstant(add(start.value, days, 0)).split('T')[0]) : start;
}
