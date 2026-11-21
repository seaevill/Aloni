import { projectedCrates } from './supply';
import { isCalendarDate } from './waits';

export interface HarvestForecastPlanting {
  id: string;
  cropId: string;
  harvestFrom?: string;
  harvestTo?: string;
  estimatedCrates?: number;
  loggedCrates?: number;
  wait: 'clear' | 'held' | 'unknown';
}

interface CropForecast {
  cropId: string;
  crates7: number;
  crates28: number;
}

export interface HarvestForecast {
  kind: 'info';
  notify: false;
  from: string;
  crates7: number;
  crates28: number;
  crops: CropForecast[];
  heldIds: string[];
  unknownIds: string[];
}

function day(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

const nonnegative = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value >= 0;

/**
 * Forward volume from the caller's Athens calendar day, inclusive. Existing
 * waits are supplied by the planting gate. This model never clears a hold.
 */
export function harvestForecast(from: string, plantings: readonly HarvestForecastPlanting[]): HarvestForecast | undefined {
  if (!isCalendarDate(from)) return;
  const today = day(from);
  const heldIds: string[] = [];
  const unknownIds: string[] = [];
  const crops = new Map<string, CropForecast>();
  let crates7 = 0;
  let crates28 = 0;
  for (const p of plantings) {
    if (p.wait === 'held') {
      heldIds.push(p.id);
      continue;
    }
    const { harvestFrom, harvestTo, estimatedCrates, loggedCrates } = p;
    if (p.wait !== 'clear' || harvestFrom === undefined || harvestTo === undefined ||
      !isCalendarDate(harvestFrom) || !isCalendarDate(harvestTo) || harvestFrom > harvestTo ||
      !nonnegative(estimatedCrates) || !nonnegative(loggedCrates)) {
      unknownIds.push(p.id);
      continue;
    }

    const start = Math.max(today, day(harvestFrom));
    const end = day(harvestTo);
    const remaining = estimatedCrates - loggedCrates;
    const next7 = projectedCrates(remaining, start, end, today, today + 6);
    const next28 = projectedCrates(remaining, start, end, today, today + 27);
    const crop = crops.get(p.cropId) ?? { cropId: p.cropId, crates7: 0, crates28: 0 };
    crop.crates7 += next7;
    crop.crates28 += next28;
    crops.set(p.cropId, crop);
    crates7 += next7;
    crates28 += next28;
  }
  return { kind: 'info', notify: false, from, crates7, crates28, crops: [...crops.values()], heldIds, unknownIds };
}
