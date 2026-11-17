import { compareDecimal, isCalendarDate, parseDecimal, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// A soil or water analysis as the lab printed it: date, optional lab and report photo, pH, EC (with the unit the lab used), free notes for the rest.
// Values are kept as typed text; an empty value is simply not recorded (unknown), never 0. No unit conversion of any kind.

export type Kind = 'soil' | 'water';
export const TABLES: Record<Kind, 'soil_tests' | 'water_tests'> = { soil: 'soil_tests', water: 'water_tests' };
export const EC_UNITS = ['dS/m', 'uS/cm'] as const; // as written on lab reports; the farmer picks the one on his report
export type EcUnit = (typeof EC_UNITS)[number];
export interface AnalysisInput { parcelId: string; sampledOn: string; lab: string; ph: string; ec: string; ecUnit: EcUnit | undefined; notes: string; photoId: string | undefined }
export type AnalysisResult =
  | { ok: true; row: Row }
  | { ok: false; parcel: boolean; date: boolean; ph: boolean; ec: boolean; ecUnit: boolean };

const ZERO = '0' as Decimal;
const MAX_PH = '14' as Decimal; // the physical scale, not an agronomic threshold

/** A typed number: nothing typed = not recorded (undefined, fine); typed but unreadable (or outside `ok`) = invalid. */
function value(text: string, within: (v: Decimal) => boolean): { value: Decimal | undefined; invalid: boolean } {
  if (text.trim() === '') return { value: undefined, invalid: false };
  const p = parseDecimal(text);
  return p.known && within(p.value) ? { value: p.value, invalid: false } : { value: undefined, invalid: true };
}

export function buildAnalysis(input: AnalysisInput, farmId: string, nowIso: string, id: string): AnalysisResult {
  const ph = value(input.ph, (v) => compareDecimal(v, ZERO) >= 0 && compareDecimal(v, MAX_PH) <= 0);
  const ec = value(input.ec, (v) => compareDecimal(v, ZERO) >= 0);
  const bad = { parcel: !input.parcelId, date: !isCalendarDate(input.sampledOn), ph: ph.invalid, ec: ec.invalid, ecUnit: ec.value !== undefined && !input.ecUnit };
  if (Object.values(bad).some(Boolean)) return { ok: false, ...bad };
  const lab = input.lab.trim();
  const notes = input.notes.trim();
  const row: Row = {
    id, farm_id: farmId, parcel_id: input.parcelId, sampled_on: input.sampledOn, created_at: nowIso, updated_at: nowIso, deleted_at: null,
    ...(lab ? { lab } : {}), ...(ph.value ? { ph: ph.value } : {}), ...(ec.value ? { ec: ec.value, ec_unit: input.ecUnit } : {}),
    ...(notes ? { notes } : {}), ...(input.photoId ? { photo_id: input.photoId } : {}),
  };
  return { ok: true, row };
}
