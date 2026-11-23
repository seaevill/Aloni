import { expect, it } from 'vitest';
import { accuracyOverlaps, walkedBoundary } from '../../src/parcels/walk';

const point = (lng: number, lat: number, accuracy_m = 2) => ({ lng, lat, accuracy_m });
const a = point(23.35, 38);
const b = point(23.351, 38);
const c = point(23.351, 38.001);
const d = point(23.35, 38.001);

it('flags overlapping accuracy and closes only a simple positive-area 2D ring', () => {
  expect(accuracyOverlaps(a, point(23.350001, 38))).toBe(true);
  expect(accuracyOverlaps(a, b)).toBe(false);
  expect(walkedBoundary([a, b])).toBeUndefined();
  expect(walkedBoundary([a, c, b, d])).toBeUndefined();
  expect(walkedBoundary([a, b, c])?.coordinates).toEqual([[[23.35, 38], [23.351, 38], [23.351, 38.001], [23.35, 38]]]);
});
