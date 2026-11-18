/** A moment as a UTC second «YYYY-MM-DDTHH:MM:SSZ» (the only form the waiting-period code accepts), or undefined for an unusable date. */
export function instantOf(d: Date): string | undefined {
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const ATHENS = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
/** The Athens wall clock of a moment, «YYYY-MM-DDTHH:mm» (the value a datetime-local field holds), whatever the phone's own time zone. */
export function athensLocalNow(d: Date): string | undefined {
  return Number.isNaN(d.getTime()) ? undefined : ATHENS.format(d).replace(' ', 'T');
}

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
/**
 * A time typed as Athens wall-clock «YYYY-MM-DDTHH:mm» → a UTC second. The phone's time zone plays no part. Athens is +02:00 in winter and +03:00 in summer, so
 * both are tried and kept only if Athens' own clock shows the typed time again: a time that does not exist (the hour skipped in spring) gives undefined; an
 * ambiguous time (the hour repeated in autumn) takes the LATER instant, because a later end can only lengthen a waiting period.
 */
export function athensInstant(local: string): string | undefined {
  if (!LOCAL.test(local)) return undefined;
  const wall = Date.parse(`${local}:00Z`); // the typed wall clock read as if it were UTC; the round trip below rejects impossible dates (31 Feb)
  if (Number.isNaN(wall)) return undefined;
  const hit = [2, 3].map((h) => new Date(wall - h * 3600000)).filter((d) => athensLocalNow(d) === local); // [0] = the later instant
  return hit.length === 0 ? undefined : instantOf(hit[0]);
}
