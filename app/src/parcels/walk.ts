import { degreesToRadians, radiansToLength } from '@turf/helpers';
import { areaM2, validBoundary, type Boundary, type Ring } from '../map/geo';
import type { Pin } from './parcel';

export function validFix(point: Pin): boolean {
  return Number.isFinite(point.accuracy_m) && point.accuracy_m > 0
    && Math.abs(point.lng) <= 180 && Math.abs(point.lat) <= 90;
}

/** A new corner must be distinguishable from the previous one at their reported accuracy. */
export function accuracyOverlaps(a: Pin, b: Pin): boolean {
  const lat = degreesToRadians(b.lat - a.lat);
  const lng = degreesToRadians(b.lng - a.lng);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(degreesToRadians(a.lat))
    * Math.cos(degreesToRadians(b.lat)) * Math.sin(lng / 2) ** 2;
  const distance = radiansToLength(2 * Math.asin(Math.sqrt(Math.min(1, h))), 'meters');
  return distance <= a.accuracy_m + b.accuracy_m;
}

type Point = Ring[number];
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const between = (a: Point, b: Point, c: Point) => c.every((v, i) => v >= Math.min(a[i], b[i]) && v <= Math.max(a[i], b[i]));

function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c); const abD = cross(a, b, d);
  const cdA = cross(c, d, a); const cdB = cross(c, d, b);
  return (abC * abD < 0 && cdA * cdB < 0) || (abC === 0 && between(a, b, c))
    || (abD === 0 && between(a, b, d)) || (cdA === 0 && between(c, d, a)) || (cdB === 0 && between(c, d, b));
}

export function walkedBoundary(points: readonly Pin[]): Boundary | undefined {
  if (points.length < 3 || !points.every(validFix)) return undefined;
  const ring: Ring = points.map(({ lng, lat }) => [lng, lat]);
  if (new Set(ring.map((p) => p.join(','))).size !== ring.length) return undefined;
  ring.push(ring[0]);
  const edges = ring.length - 1;
  for (let a = 0; a < edges; a += 1) {
    for (let b = a + 2; b < edges; b += 1) {
      if (a === 0 && b === edges - 1) continue;
      if (intersects(ring[a], ring[a + 1], ring[b], ring[b + 1])) return undefined;
    }
  }
  const boundary: Boundary = { type: 'Polygon', coordinates: [ring] };
  const area = areaM2(boundary);
  return validBoundary(boundary) && area !== undefined && area > 0 ? boundary : undefined;
}
