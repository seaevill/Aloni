import type { Output } from './engine';
import { athensDate } from './stock';
import { supplyTable, type SupplyPlanting, type WeeklyOrder } from './supply';
import { dateAfterDays, isCalendarDate, parseInstant } from './waits';

const DAY_MS = 86_400_000;
const LAST_DAY = Date.parse('9999-12-31');

type Eligibility = { state: 'clear' } | { state: 'held'; until: string } | { state: 'unknown' };

export interface GapFacts {
  /** Confidence, when supplied, is the upstream minimum across orders, yield and forecast. */
  orders: readonly (WeeklyOrder & { sowingLeadDays?: number; confidence?: Output['confidence'] })[];
  plantings: readonly (Omit<SupplyPlanting, 'safeFrom'> & { eligibility: Eligibility })[];
  params: { weeks: number; minPct: number; minCrates: number };
}

const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;

type GapOutput = Pick<Output, 'crop_ids' | 'kind' | 'category' | 'values' | 'severity' | 'confidence' | 'window'>;

export function gapOutputs(facts: GapFacts, asOf: string, signed: boolean): GapOutput[] {
  const { weeks, minPct, minCrates } = facts.params;
  const today = athensDate(asOf);
  return facts.orders.map((order) => {
    const eligible: SupplyPlanting[] = [];
    const unknown: string[] = [];
    const excluded: { planting_id: string; until: string; reason: 'phi' }[] = [];
    for (const planting of facts.plantings.filter((p) => p.cropId === order.cropId)) {
      const { eligibility } = planting;
      if (eligibility.state === 'unknown' || (eligibility.state === 'held' && !parseInstant(eligibility.until).known)
        || !isCalendarDate(planting.harvestFrom) || !isCalendarDate(planting.harvestTo) || planting.harvestFrom > planting.harvestTo
        || !nonnegative(planting.estCrates) || !nonnegative(planting.loggedCrates)) {
        unknown.push(planting.id);
        continue;
      }
      const safeFrom = eligibility.state === 'held' ? athensDate(eligibility.until) : undefined;
      if (eligibility.state === 'held' && eligibility.until > asOf) excluded.push({ planting_id: planting.id, until: eligibility.until, reason: 'phi' });
      eligible.push({ ...planting, safeFrom });
    }

    const base = { crop_ids: [order.cropId] };
    const inputsValid = Number.isSafeInteger(weeks) && weeks > 0 && Date.parse(today) + weeks * 7 * DAY_MS <= LAST_DAY
      && nonnegative(order.cratesPerWeek) && order.multipliers.every((m) => isCalendarDate(m.weekStart) && nonnegative(m.factor));
    const rows = inputsValid ? supplyTable(today, weeks, eligible, order) : [];
    const values = {
      weeks: rows.map((row) => row.week),
      orders: rows.map((row) => row.orders),
      supply_by_planting: Object.fromEntries(eligible.map(({ id }) => [id, rows.map((row) => row.byPlanting[id])])),
      supply: rows.map((row) => row.supply),
      gap: rows.map((row) => row.gap),
      excluded,
      unknown_planting_ids: unknown,
    };
    const info = { ...base, kind: 'info', category: 'supply_gap_inputs' } as const;
    if (!signed) return { ...info, values: { ...values, badge: 'not_signed_off' } };
    if (!inputsValid || unknown.length || !nonnegative(minPct) || !nonnegative(minCrates)
      || rows.some((row) => !Number.isFinite(row.gap))) return { ...info, values: { ...values, badge: 'inputs_unknown' } };

    const alerts = rows.filter((row) => row.gap > 0 && row.gap >= Math.max(minPct * row.orders / 100, minCrates));
    if (!alerts.length) return { ...info, values };
    const start = alerts[0].week;
    const end = dateAfterDays(alerts[alerts.length - 1].week, 6);
    if (!end.known) return { ...info, values };
    const lead = order.sowingLeadDays;
    const daysUntilFirstShortfallEnds = (Date.parse(start) - Date.parse(today)) / DAY_MS + 6;
    // Lead time can rule sowing out. Suitability to sow is a separate rule.
    const cannotArrive = lead !== undefined && nonnegative(lead) && lead > daysUntilFirstShortfallEnds;
    const sowing = cannotArrive ? { sowing_can_arrive_in_time: false, action: 'buy_in_or_agree_volumes' } : {};
    return {
      ...base, kind: 'alert', category: 'supply_gap', severity: 'medium', confidence: order.confidence,
      window: { start, end: end.value },
      values: { ...values, ...sowing, gap_week1: values.gap[0], alert_weeks: alerts.map((row) => row.week), links_to: 'SOW' },
    };
  });
}
