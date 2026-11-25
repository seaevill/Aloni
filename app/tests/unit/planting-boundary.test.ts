import { describe, expect, it } from 'vitest';
import { buildPlanting } from '../../src/plantings/planting';
import { applyEdit } from '../../src/records/edits';

const F = '11111111-1111-4111-8111-111111111111';
const base = { parcelId: 'p', cropId: 'c', variety: '', lot: '', area: '0,25', sownOn: '2026-11-10', status: 'growing' as const };
const poly = { type: 'Polygon', coordinates: [[[23.35, 37.99], [23.351, 37.99], [23.351, 37.991], [23.35, 37.991], [23.35, 37.99]]] };

// SQL 0040: apply_one writes a WHOLE row, so a phone that dropped `boundary` while editing another field would wipe an outline. The phone must carry it, and must never send the server-owned area_m2.
describe('planting outline on the phone', () => {
  it('a valid outline is carried on the row; no outline = no field; an invalid one is refused, not dropped', () => {
    const r = buildPlanting({ ...base, boundary: poly }, F, 'n', 'id');
    expect(r.ok && r.row.boundary).toEqual(poly);
    expect(r.ok && 'area_m2' in r.row).toBe(false);
    const none = buildPlanting(base, F, 'n', 'id');
    expect(none.ok && 'boundary' in none.row).toBe(false);
    for (const bad of [{ type: 'Polygon', coordinates: [] }, { type: 'Point', coordinates: [1, 2] }, 'x', null]) expect(buildPlanting({ ...base, boundary: bad }, F, 'n', 'id')).toMatchObject({ ok: false, boundary: true });
  });
  it('editing another field keeps the outline and the server-computed area', () => {
    const existing = { id: 'x', farm_id: F, area_str: '0.25', status: 'growing', boundary: poly, area_m2: 123.4 };
    const out = applyEdit(existing, { status: 'harvesting' }, 'changed', 'n');
    expect(out.kind).toBe('ok');
    const row = (out as unknown as { row: Record<string, unknown> }).row;
    expect(row.boundary).toEqual(poly);
    expect(row.area_m2).toBe(123.4);
  });
});
