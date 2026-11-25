import { compareDecimal, parseDecimal, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { MAX_AREA } from '../parcels/parcel';
import { validBoundary } from '../map/geo';

export const STATUSES = ['planned', 'growing', 'harvesting', 'finished'] as const;
export type Status = (typeof STATUSES)[number];
export interface PlantingInput {
  parcelId: string; cropId: string; variety: string; lot: string; area: string; sownOn: string; status: Status;
  /** The planting's own outline inside its parcel (SQL 0040): a valid GeoJSON Polygon or nothing. It NEVER replaces the typed area; the server computes `area_m2` itself and the phone never sends it. */
  boundary?: unknown;
}
export interface PlantingErrors { parcel: boolean; crop: boolean; area: 'missing' | 'invalid' | 'implausible' | undefined; date: boolean; boundary?: true }
export type PlantingResult = { ok: true; row: Row } | ({ ok: false } & PlantingErrors);

/** «2026-11-17» only when it is a real calendar date (no «2026-02-31», no «Invalid Date»). */
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s; // 2026-02-31 rolls over to 03-03 and is refused
}

/** Today in Europe/Athens as «YYYY-MM-DD», or undefined if the clock is unusable (the field then stays empty: no invented date). */
export function athensToday(now: Date): string | undefined {
  try {
    const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return validDate(s) ? s : undefined;
  } catch {
    return undefined;
  }
}

/** A planting needs a parcel, a crop, a typed area and a real sowing date. Variety and lot label are optional free text. */
export function buildPlanting(input: PlantingInput, farmId: string, nowIso: string, id: string): PlantingResult {
  const area = parseDecimal(input.area);
  const areaProblem = !area.known ? (area.reason === 'missing' ? 'missing' : 'invalid') : compareDecimal(area.value, '0' as Decimal) > 0 ? (compareDecimal(area.value, MAX_AREA) > 0 ? 'implausible' : undefined) : 'invalid';
  const badOutline = input.boundary !== undefined && !validBoundary(input.boundary);   // an outline that is not a valid polygon is refused, never dropped silently
  const errors: PlantingErrors = { parcel: !input.parcelId, crop: !input.cropId, area: areaProblem, date: !validDate(input.sownOn), ...(badOutline ? { boundary: true as const } : {}) };
  if (!area.known || errors.parcel || errors.crop || errors.area || errors.date || errors.boundary) return { ok: false, ...errors };
  const variety = input.variety.trim();
  const lot = input.lot.trim();
  const row: Row = {
    id, farm_id: farmId, parcel_id: input.parcelId, crop_id: input.cropId, area_str: area.value, sown_on: input.sownOn, status: input.status,
    created_at: nowIso, updated_at: nowIso, deleted_at: null,
    ...(variety ? { variety } : {}), ...(lot ? { lot_label: lot } : {}), ...(input.boundary !== undefined ? { boundary: input.boundary } : {}),
  };
  return { ok: true, row };
}

/** A warning (never a block): the planting is larger than its parcel. Unreadable areas give no warning. */
export function exceedsParcel(plantingArea: string, parcelArea: unknown): boolean {
  const a = parseDecimal(plantingArea);
  const p = parseDecimal(String(parcelArea ?? ''));
  return a.known && p.known && compareDecimal(a.value, p.value) > 0;
}
