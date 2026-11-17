import { describe, expect, it } from 'vitest';
import { buildProduct, type ProductInput } from '../../src/products/product';

const farm = '11111111-1111-4111-8111-111111111111';
const now = '2026-11-20T10:00:00.000Z';
const input = (over: Partial<ProductInput> = {}): ProductInput => ({ name: 'Kocide 2000', regNo: '', type: 'fungicide', unit: 'kg', photoId: undefined, ...over });

describe('buildProduct', () => {
  it('keeps the name as written and stores the optional fields only when given', () => {
    const r = buildProduct(input(), farm, now, 'id-1');
    expect(r).toMatchObject({ ok: true, row: { id: 'id-1', farm_id: farm, name: 'Kocide 2000', type: 'fungicide', unit: 'kg', deleted_at: null } });
    expect(r.ok && ('reg_no' in r.row || 'label_photo_id' in r.row)).toBe(false);
    expect(buildProduct(input({ regNo: ' 1234/56 ', photoId: 'photo-1' }), farm, now, 'id-2')).toMatchObject({ ok: true, row: { reg_no: '1234/56', label_photo_id: 'photo-1' } });
  });
  it('nothing is preselected: a missing name, type or unit is refused and says which', () => {
    expect(buildProduct(input({ name: '  ' }), farm, now, 'x')).toEqual({ ok: false, name: true, type: false, unit: false });
    expect(buildProduct(input({ type: undefined }), farm, now, 'x')).toEqual({ ok: false, name: false, type: true, unit: false });
    expect(buildProduct(input({ unit: undefined }), farm, now, 'x')).toEqual({ ok: false, name: false, type: false, unit: true });
    expect(buildProduct({ name: '', regNo: '', type: undefined, unit: undefined, photoId: undefined }, farm, now, 'x')).toEqual({ ok: false, name: true, type: true, unit: true });
  });
  it('a product carries no label values: no dose, PHI, REI or application count is ever set here', () => {
    const r = buildProduct(input(), farm, now, 'id-1');
    expect(r.ok && Object.keys(r.row).filter((k) => /dose|phi|rei|max_app/.test(k))).toEqual([]);
  });
});
