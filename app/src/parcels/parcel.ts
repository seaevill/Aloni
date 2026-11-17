import { compareDecimal, parseDecimal, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';

export const TOPO = ['plain', 'slope', 'coast'] as const; // Πεδινό / Πλαγιά / Παραλιακό; optional, never defaulted
export type Topo = (typeof TOPO)[number];
export interface Pin { lat: number; lng: number; accuracy_m: number }
export interface ParcelInput { name: string; area: string; topo: Topo | undefined; pin: Pin | undefined }
export type ParcelResult = { ok: true; row: Row } | { ok: false; name: boolean; area: 'missing' | 'invalid' | undefined };

/**
 * A parcel needs a name and an area in στρέμματα (typed, never guessed: «1.000» is refused). The pin and the topography are optional
 * and stay unset unless the farmer chose them. The area is kept as the text he typed (0,625 stays 0,625).
 */
export function buildParcel(input: ParcelInput, farmId: string, nowIso: string, id: string): ParcelResult {
  const name = input.name.trim();
  const area = parseDecimal(input.area);
  const areaProblem = !area.known ? (area.reason === 'missing' ? 'missing' : 'invalid') : compareDecimal(area.value, '0' as Decimal) > 0 ? undefined : 'invalid';
  if (!name || areaProblem || !area.known) return { ok: false, name: !name, area: areaProblem };
  const row: Row = {
    id, farm_id: farmId, name, area_str: area.value, created_at: nowIso, updated_at: nowIso, deleted_at: null,
    ...(input.topo ? { topo_class: input.topo } : {}),
    ...(input.pin ? { lat: input.pin.lat, lng: input.pin.lng, pin_accuracy_m: input.pin.accuracy_m } : {}),
  };
  return { ok: true, row };
}

/** Archive = set deleted_at (nothing is ever deleted); restore = clear it. */
export const archived = (row: Row, nowIso: string): Row => ({ ...row, deleted_at: nowIso, updated_at: nowIso });
export const restored = (row: Row, nowIso: string): Row => ({ ...row, deleted_at: null, updated_at: nowIso });
