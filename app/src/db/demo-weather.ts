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
