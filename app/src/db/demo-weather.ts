// The Demo farm's weather is fictional and has fixed dates. It is moved as a whole so the prototype's «today» is the real today (Athens): the Demo always has today and the next days filled.
// Values are copied exactly; only `date` moves. A date that cannot be read is kept as it is.
const DAY_MS = 86_400_000;
const at = (day: string): number | undefined => (/^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T12:00:00Z`) : undefined);

export function shiftWeather<T extends { date?: unknown }>(days: readonly T[], protoToday: string, today: string): T[] {
  const from = at(protoToday); const to = at(today);
  if (from === undefined || to === undefined || from === to) return [...days];
  const shift = to - from;
  return days.map((d) => {
    const ms = typeof d.date === 'string' ? at(d.date) : undefined;
    return ms === undefined ? d : { ...d, date: new Date(ms + shift).toISOString().slice(0, 10) };
  });
}

const moveDay = (v: unknown, shift: number): unknown => { const ms = typeof v === 'string' ? at(v) : undefined; return ms === undefined ? v : new Date(ms + shift).toISOString().slice(0, 10); };

/** The Demo's jobs and plantings move by the same number of days as its weather, so the sample farm always has recent sprays, harvests and a harvest window around the real today. Only the day fields move
 *  (job `date`; planting `sown`, `harvest_from`, `harvest_to`); every relation between them (waiting periods, order) is kept. Soil analysis dates and expiry dates stay as they are. */
export function shiftDemoDates<T extends object>(input: T, protoToday: string, today: string): T {
  const data = input as { jobs?: ReadonlyArray<Record<string, unknown>>; plantings?: ReadonlyArray<Record<string, unknown>> };
  const from = at(protoToday); const to = at(today);
  if (from === undefined || to === undefined || from === to) return input;
  const shift = to - from;
  const jobs = data.jobs?.map((j) => ({ ...j, date: moveDay(j.date, shift) }));
  const plantings = data.plantings?.map((p) => ({ ...p, sown: moveDay(p.sown, shift), harvest_from: moveDay(p.harvest_from, shift), harvest_to: moveDay(p.harvest_to, shift) }));
  return { ...input, ...(jobs ? { jobs } : {}), ...(plantings ? { plantings } : {}) };
}

/** One day moved like the rest of the Demo (a fixed prototype day becomes the same distance from the real today). A day that cannot be read is kept. */
export function shiftDay(day: string, protoToday: string, today: string): string {
  const from = at(protoToday); const to = at(today);
  if (from === undefined || to === undefined) return day;
  const moved = moveDay(day, to - from);
  return typeof moved === 'string' ? moved : day;
}
