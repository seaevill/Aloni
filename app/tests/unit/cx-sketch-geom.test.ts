import { describe, expect, it } from 'vitest';
import type { Boundary } from '../../src/map/geo';
import { closePlantingSketch } from '../../src/plantings/sketch-geom';

const parcel: Boundary = { type: 'Polygon', coordinates: [[[0, 0], [5, 0], [5, 5], [4, 5], [4, 1], [1, 1], [1, 5], [0, 5], [0, 0]]] };

describe('planting sketch geometry', () => {
  it('closes a contained polygon and reports positive geodesic area', () => {
    const result = closePlantingSketch(parcel, [[0.1, 0.1], [0.6, 0.1], [0.6, 0.6]]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.boundary.coordinates[0].at(-1)).toEqual([0.1, 0.1]);
      expect(result.stremma).toBeGreaterThan(0);
    }
  });

  it('rejects outside vertices and edges crossing a concave parcel', () => {
    expect(closePlantingSketch(parcel, [[-0.1, 0], [0.4, 0], [0.2, 0.5]])).toEqual({ ok: false, reason: 'outside' });
    expect(closePlantingSketch(parcel, [[0.5, 3], [4.5, 3], [4.5, 4]])).toEqual({ ok: false, reason: 'outside' });
  });

  it('rejects a crossing, repeated vertices, and zero area', () => {
    expect(closePlantingSketch(parcel, [[0, 0], [1, 1], [0, 1], [1, 0]])).toEqual({ ok: false, reason: 'invalid' });
    expect(closePlantingSketch(parcel, [[0, 0], [1, 0], [1, 0], [1, 1]])).toEqual({ ok: false, reason: 'invalid' });
    expect(closePlantingSketch(parcel, [[0, 0], [1, 0], [2, 0]])).toEqual({ ok: false, reason: 'invalid' });
  });
});
