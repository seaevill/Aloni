import { describe, expect, it } from 'vitest';
import { areaM2, differencePct, toStremma, typedStremma, validBoundary } from '../../src/map/geo';

// a square of about 100 m × 100 m near Megara (lat 38.0): 0.0011398° of longitude ≈ 100 m
const square = { type: 'Polygon' as const, coordinates: [[[23.35, 38.0], [23.3511398, 38.0], [23.3511398, 38.0009], [23.35, 38.0009], [23.35, 38.0]]] };
describe('parcel boundary from the map', () => {
  it('accepts a closed ring of 3+ distinct corners, refuses everything else', () => {
    expect(validBoundary(square)).toBe(true);
    expect(validBoundary({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] })).toBe(false);                    // too few corners
    expect(validBoundary({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] })).toBe(false);          // not closed
    expect(validBoundary({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 95], [0, 0]]] })).toBe(false);         // latitude out of range
    expect(validBoundary({ type: 'Point', coordinates: [1, 2] })).toBe(false);
    expect(validBoundary(undefined)).toBe(false);
  });
  it('the area is about 10 000 m² = 10 στρέμματα, within 2 %', () => {
    const m2 = areaM2(square);
    expect(m2).toBeGreaterThan(9800); expect(m2).toBeLessThan(10200);
    expect(toStremma(m2 ?? 0)).toBeCloseTo(10, 0);
    expect(areaM2({ type: 'Polygon', coordinates: [] })).toBeUndefined();
  });
  it('compares with the typed area (comma or point) and gives the difference in percent; unreadable typed text gives nothing', () => {
    expect(typedStremma('0,625')).toBe(0.625); expect(typedStremma('12.5')).toBe(12.5);
    expect(typedStremma('1.000')).toBe(1); expect(typedStremma('')).toBeUndefined(); expect(typedStremma('0')).toBeUndefined(); expect(typedStremma('abc')).toBeUndefined();
    expect(differencePct(11, 10)).toBeCloseTo(10, 5); expect(differencePct(9, 10)).toBeCloseTo(-10, 5);
  });
});
