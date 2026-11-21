// SUPPLY vs ORDERS (golden case A05, rule GAP): information only. For each ISO week (Monday–Sunday) the crates ordered, the crates expected from the plantings and the difference.
// The rule is UNSIGNED (RULES.md [SET]): this file only COMPUTES the table so it can be SHOWN. It raises no alert, sends nothing and decides nothing.
// Supply model (the v2 method; the harvest forecast replaces it later): the crates still expected from a planting (estimate minus what was logged) are spread EVENLY over the days from
// max(as_of, harvest_from, safe_from) to harvest_to, both included. `safe_from` is the end of the waiting period: nothing counts before it (QA P0-2).
// Crates are counted, not doses; the weekly figures are exact fractions computed in floating point and are meant to be shown with one decimal.

export interface SupplyPlanting { id: string; cropId: string; estCrates: number; loggedCrates: number; harvestFrom: string; harvestTo: string; safeFrom: string | undefined }
export interface WeeklyOrder { cropId: string; cratesPerWeek: number; multipliers: ReadonlyArray<{ weekStart: string; factor: number }> }
export interface SupplyRow { week: string; orders: number; supply: number; gap: number; byPlanting: Record<string, number> }

const DAY = 86_400_000;
const dayNumber = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY;   // a midnight UTC instant divided by a day is a whole number (or NaN for an unreadable date)
const isoOf = (n: number): string => new Date(n * DAY).toISOString().slice(0, 10);
const mondayOf = (n: number): number => n - ((new Date(n * DAY).getUTCDay() + 6) % 7);

/** Spread a remaining quantity evenly over an inclusive harvest range and count only overlapping days. */
export function projectedCrates(remaining: number, from: number, to: number, start: number, end: number): number {
  const span = to - from + 1;
  const days = Math.min(to, end) - Math.max(from, start) + 1;
  let volume = 0; // A known planting contributes zero days outside its harvest range.
  if (days > 0 && span > 0 && remaining > 0) volume = (remaining * days) / span;
  return volume;
}

/** The table for one crop from `asOf` (the first week is the week of asOf) for `weeks` weeks. A planting with an unreadable date counts for nothing (never guessed). */
export function supplyTable(asOf: string, weeks: number, plantings: readonly SupplyPlanting[], order: WeeklyOrder): SupplyRow[] {
  const today = dayNumber(asOf);
  const first = mondayOf(today);
  const rows: SupplyRow[] = [];
  for (let w = 0; w < weeks; w += 1) {
    const start = first + w * 7;
    const week = isoOf(start);
    const multiplier = order.multipliers.find((m) => m.weekStart === week);
    let orders = order.cratesPerWeek;
    if (multiplier !== undefined) orders = order.cratesPerWeek * multiplier.factor;   // only a feast week has a factor
    const byPlanting: Record<string, number> = {};
    for (const p of plantings.filter((x) => x.cropId === order.cropId)) {
      const starts = [today, dayNumber(p.harvestFrom)];
      if (p.safeFrom !== undefined) starts.push(dayNumber(p.safeFrom));   // nothing counts before the waiting period ends
      const from = Math.max(...starts);
      const to = dayNumber(p.harvestTo);
      const remaining = p.estCrates - p.loggedCrates;
      byPlanting[p.id] = projectedCrates(remaining, from, to, start, start + 6);
    }
    const supply = Object.values(byPlanting).reduce((a, b) => a + b, 0);
    rows.push({ week, orders, supply, gap: orders - supply, byPlanting });
  }
  return rows;
}
