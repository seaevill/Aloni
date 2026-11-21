import type { HarvestForecastPlanting } from './harvestForecast';
import { projectedCrates } from './supply';
import { dateAfterDays, isCalendarDate } from './waits';

export interface SupplyWeek {
  week: string;
  orders: number | null;
  eligible: number | null;
  heldOrUnknown: number | null;
  /** Eligible minus orders. No decision or notification is attached. */
  delta: number | null;
}
export interface WeeklySupplyInput {
  cropId: string;
  today: string;
  plantings: readonly HarvestForecastPlanting[];
  orders?: Readonly<Record<string, number | null>>;
}

const dayMs = 86_400_000;
const day = (date: string) => Date.parse(date) / dayMs;
const quantity = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function estimate(p: HarvestForecastPlanting, today: number, start: number): number | null {
  if (!p.harvestFrom || !p.harvestTo || !isCalendarDate(p.harvestFrom) || !isCalendarDate(p.harvestTo) ||
    p.harvestFrom > p.harvestTo || !quantity(p.estimatedCrates) || !quantity(p.loggedCrates)) return null;
  return projectedCrates(p.estimatedCrates - p.loggedCrates, Math.max(today, day(p.harvestFrom)), day(p.harvestTo), start, start + 6);
}

function total(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  const sum = values.filter((value): value is number => value !== null).reduce((a, b) => a + b, 0);
  return Number.isFinite(sum) ? sum : null;
}

/** Four ISO weeks starting in the caller's Athens calendar week. Excluded supply is never eligible. */
export function weeklySupply(input: WeeklySupplyInput, weeks?: number): SupplyWeek[] {
  if (!isCalendarDate(input.today) || (weeks !== undefined && (!Number.isInteger(weeks) || weeks < 1 || weeks > 52))) return [];
  const offsets = weeks === undefined ? [0, 7, 14, 21] : Array.from({ length: weeks }, (_, i) => i * 7);
  const today = day(input.today);
  const daysSinceMonday = (new Date(today * dayMs).getUTCDay() + 6) % 7;
  const firstMonday = today - daysSinceMonday;
  const monday = new Date(firstMonday * dayMs).toISOString().slice(0, 10);
  const plantings = input.plantings.filter((p) => p.cropId === input.cropId);
  const clear = plantings.filter((p) => p.wait === 'clear');
  const excluded = plantings.filter((p) => p.wait !== 'clear');
  const eligibleKnown = clear.length > 0 || (excluded.length > 0 && excluded.every((p) => p.wait === 'held'));
  return offsets.map((offset) => {
    const week = dateAfterDays(monday, offset);
    if (!week.known) return [];
    const start = firstMonday + offset;
    const ordered = input.orders?.[week.value];
    const orders = quantity(ordered) ? ordered : null;
    const eligible = eligibleKnown ? total(clear.map((p) => estimate(p, today, start))) : null;
    const heldOrUnknown = plantings.length ? total(excluded.map((p) => estimate(p, today, start))) : null;
    const delta = orders !== null && eligible !== null ? eligible - orders : null;
    return [{ week: week.value, orders, eligible, heldOrUnknown, delta }];
  }).flat();
}
