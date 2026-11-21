import { dateAfterDays, isCalendarDate } from '@aloni/rules-core';

interface Movement {
  id: string;
  crop: string;
  day: string;
  crates: number;
}
export type HarvestMovement =
  | (Movement & { kind: 'in'; wait: 'eligible' | 'held' | 'unknown' })
  | (Movement & { kind: 'dispatch' });

interface HarvestLot { id: string; crates: number; ageDays: number }
type StockResult =
  | { known: true; eligible: number; held: number; unknown: number; lots: HarvestLot[] }
  | { known: false; reason: 'invalid_movement' | 'no_movements' | 'dispatch_exceeds_available' };

const dayMs = 86_400_000;
const valid = (row: HarvestMovement) => isCalendarDate(row.day) && Number.isSafeInteger(row.crates) && row.crates > 0;

/** The caller supplies same-day rows in recorded append order. Forecasts are not stock movements. */
export function harvestStock(crop: string, today: string, movements: readonly HarvestMovement[]): StockResult {
  const rows = movements.filter((m) => m.crop === crop);
  if (!isCalendarDate(today) || rows.some((m) => !valid(m)) || new Set(rows.map((m) => m.id)).size !== rows.length) return { known: false, reason: 'invalid_movement' };
  const throughToday = rows.filter((m) => m.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  if (!throughToday.length) return { known: false, reason: 'no_movements' };
  const lots: HarvestLot[] = [];
  let held = 0;
  let unknown = 0;
  for (const row of throughToday) {
    if (row.kind === 'in') {
      if (row.wait === 'held') held += row.crates;
      else if (row.wait === 'unknown') unknown += row.crates;
      else lots.push({ id: row.id, crates: row.crates, ageDays: (Date.parse(today) - Date.parse(row.day)) / dayMs });
      continue;
    }
    let remaining = row.crates;
    for (const lot of lots) {
      const taken = Math.min(lot.crates, remaining);
      lot.crates -= taken;
      remaining -= taken;
      if (remaining === 0) break;
    }
    if (remaining > 0) return { known: false, reason: 'dispatch_exceeds_available' };
  }
  const inStock = lots.filter((lot) => lot.crates > 0);
  const eligible = inStock.reduce((total, lot) => total + lot.crates, 0);
  if (![eligible, held, unknown].every(Number.isSafeInteger)) return { known: false, reason: 'invalid_movement' };
  return { known: true, eligible, held, unknown, lots: inStock };
}

export function outTomorrow(today: string, movements: readonly HarvestMovement[]): HarvestMovement[] {
  const tomorrow = dateAfterDays(today, 1);
  return tomorrow.known ? movements.filter((m) => m.kind === 'dispatch' && m.day === tomorrow.value && valid(m)) : [];
}
