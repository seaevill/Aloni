import type { Row } from '../db/schema';

export const TYPES = ['fungicide', 'insecticide', 'herbicide', 'fertiliser', 'other'] as const;
export type ProductType = (typeof TYPES)[number];
export const UNITS = ['L', 'kg'] as const; // how the product is bought and stored; the DOSE units are chosen per label use, never converted from these
export type ProductUnit = (typeof UNITS)[number];
export interface ProductInput { name: string; regNo: string; type: ProductType | undefined; unit: ProductUnit | undefined; photoId: string | undefined }
export type ProductResult = { ok: true; row: Row } | { ok: false; name: boolean; type: boolean; unit: boolean };

/** A product needs its name as printed, a type and a unit (both chosen, nothing preselected). The registration number and the label photo are optional. */
export function buildProduct(input: ProductInput, farmId: string, nowIso: string, id: string): ProductResult {
  const name = input.name.trim();
  if (!name || !input.type || !input.unit) return { ok: false, name: !name, type: !input.type, unit: !input.unit };
  const regNo = input.regNo.trim();
  const row: Row = {
    id, farm_id: farmId, name, type: input.type, unit: input.unit, created_at: nowIso, updated_at: nowIso, deleted_at: null,
    ...(regNo ? { reg_no: regNo } : {}), ...(input.photoId ? { label_photo_id: input.photoId } : {}),
  };
  return { ok: true, row };
}
