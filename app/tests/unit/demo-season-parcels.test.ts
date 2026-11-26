import { describe, expect, it } from 'vitest';
import { SEASON_PARCELS } from '../../src/db/demo-season/parcels';
import { areaM2, validBoundary } from '../../src/map/geo';

describe('Demo season parcels (fictional, queue item 31)', () => {
  it('seven parcels, 2–25 στρ., about 70 στρ. in total, unique ids and names', () => {
    expect(SEASON_PARCELS).toHaveLength(7);
    const areas = SEASON_PARCELS.map((p) => parseFloat(p.area_str));
    expect(Math.min(...areas)).toBeGreaterThanOrEqual(2); expect(Math.max(...areas)).toBeLessThanOrEqual(25);
    expect(areas.reduce((a, b) => a + b, 0)).toBe(70);
    expect(new Set(SEASON_PARCELS.map((p) => p.id)).size).toBe(7); expect(new Set(SEASON_PARCELS.map((p) => p.name)).size).toBe(7);
  });
  it('every outline is a valid polygon whose drawn area is within 3 % of the typed area (the typed area stays the authority)', () => {
    for (const p of SEASON_PARCELS) {
      expect(validBoundary(p.boundary), p.name).toBe(true);
      const drawn = (areaM2(p.boundary) ?? 0) / 1000;
      expect(Math.abs(drawn - parseFloat(p.area_str)) / parseFloat(p.area_str), `${p.name} drawn ${drawn}`).toBeLessThan(0.03);
    }
  });
  it('the outlines lie on the Megara plain and do not overlap each other', () => {
    for (const p of SEASON_PARCELS) { const [lng, lat] = p.boundary.coordinates[0][0]; expect(lng).toBeGreaterThan(23.28); expect(lng).toBeLessThan(23.42); expect(lat).toBeGreaterThan(37.95); expect(lat).toBeLessThan(38.05); }
    const box = (p: (typeof SEASON_PARCELS)[number]) => { const xs = p.boundary.coordinates[0].map((c) => c[0]); const ys = p.boundary.coordinates[0].map((c) => c[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
    for (let i = 0; i < SEASON_PARCELS.length; i++) for (let j = i + 1; j < SEASON_PARCELS.length; j++) {
      const a = box(SEASON_PARCELS[i]!); const b = box(SEASON_PARCELS[j]!);
      expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1, `${SEASON_PARCELS[i]!.name} / ${SEASON_PARCELS[j]!.name}`).toBe(false);
    }
  });
  it('ΚΑΕΚ: exactly 12 digits, all start with 99 (never a real number), all different', () => {
    for (const p of SEASON_PARCELS) expect(p.kaek).toMatch(/^99\d{10}$/);
    expect(new Set(SEASON_PARCELS.map((p) => p.kaek)).size).toBe(7);
  });
});
