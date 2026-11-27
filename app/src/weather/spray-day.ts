import type { WeatherRow } from '../db/schema';
import { snapshotOf, type Snapshot } from '../fieldwork/fieldwork';
import { athensToday } from '../plantings/planting';
import { parseDays } from './strip';

export interface SprayDayWeather { parcel_id: string; weather: Snapshot | undefined }

/**
 * The stored weather of the Athens calendar day on which a spraying was recorded, one entry per distinct parcel.
 * Display only: nothing is written and no other day, parcel or forecast stands in. A missing value is `undefined` («unknown»).
 */
export function sprayWeather(sprayedAt: string, parcelIds: readonly string[], rows: readonly WeatherRow[]): SprayDayWeather[] {
  const ms = Date.parse(sprayedAt);
  const day = Number.isNaN(ms) ? undefined : athensToday(new Date(ms));
  return [...new Set(parcelIds)].map((parcel_id) => {
    const row = rows.find((w) => w.parcel_id === parcel_id);
    return { parcel_id, weather: day && row ? snapshotOf(parseDays(row.days), day) : undefined };
  });
}
