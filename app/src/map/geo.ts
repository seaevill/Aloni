import area from '@turf/area';
import { polygon } from '@turf/helpers';

// The parcel BOUNDARY drawn on the map. The area computed from it is INFORMATION: it is shown next to the area the farmer typed (στρέμματα), the difference is shown, and the typed value is NEVER replaced.
export type Ring = Array<[number, number]>;
export interface Boundary { type: 'Polygon'; coordinates: Ring[] }

/** A drawn polygon is usable when it is one closed ring of at least 3 distinct corners with real coordinates (longitude −180..180, latitude −90..90). */
export function validBoundary(b: unknown): b is Boundary {
  if (typeof b !== 'object' || b === null) return false;
  const g = b as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates) || g.coordinates.length !== 1) return false;
  const ring = g.coordinates[0] as unknown;
  if (!Array.isArray(ring) || ring.length < 4) return false;
  const ok = ring.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90);
  const first = ring[0] as number[]; const last = ring[ring.length - 1] as number[];
  const closed = first[0] === last[0] && first[1] === last[1];
  const distinct = new Set(ring.map((p) => `${(p as number[])[0]},${(p as number[])[1]}`)).size;
  return ok && closed && distinct >= 3;
}

/** Area in square metres (geodesic, turf). Undefined for an unusable polygon. */
export function areaM2(b: unknown): number | undefined { return validBoundary(b) ? area(polygon(b.coordinates)) : undefined; }

/** 1 στρέμμα = 1000 m². */
export const toStremma = (m2: number): number => m2 / 1000;

/** The typed area (comma or point) as a number, only for the comparison; undefined when unreadable. */
export function typedStremma(text: string): number | undefined {
  const t = text.trim().split(',').join('.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  const v = parseFloat(t);   // display comparison only, never stored
  return v > 0 ? v : undefined;
}

/** How far the map area is from the typed one, in percent of the typed one (positive = the map is bigger). */
export const differencePct = (mapStr: number, typed: number): number => ((mapStr - typed) / typed) * 100;
