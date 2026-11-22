import type { SupplyWeek } from '../weeklySupply';

const usable = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0;

/** An arithmetic shortfall, with no recommended action. */
export function sowingGaps(weeks: readonly SupplyWeek[]) {
  return weeks.flatMap((week) => usable(week.eligible) && usable(week.orders) && week.eligible < week.orders
    ? [{ week: week.week, eligible: week.eligible, orders: week.orders, shortfall: week.orders - week.eligible }]
    : []);
}
