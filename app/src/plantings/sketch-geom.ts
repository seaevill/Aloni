import { areaM2, toStremma, validBoundary, type Boundary, type Ring } from '../map/geo';

type Vertex = Ring[number];
type Result = { ok: false; reason: 'invalid' | 'outside' } | { ok: true; boundary: Boundary; stremma: number };

const cross = ([x, y]: Vertex, [a, b]: Vertex) => x * b - y * a;
const subtract = ([x, y]: Vertex, [a, b]: Vertex): Vertex => [x - a, y - b];
const between = (a: number, b: number, v: number) => v >= Math.min(a, b) && v <= Math.max(a, b);
const along = ([x, y]: Vertex, [a, b]: Vertex, t: number): Vertex => [x + (a - x) * t, y + (b - y) * t];

function edgeCuts(a: Vertex, b: Vertex, c: Vertex, d: Vertex): number[] {
  const ab = subtract(b, a);
  const cd = subtract(d, c);
  const ac = subtract(c, a);
  const determinant = cross(ab, cd);
  if (determinant !== 0) {
    const t = cross(ac, cd) / determinant;
    const u = cross(ac, ab) / determinant;
    return between(0, 1, t) && between(0, 1, u) ? [t] : [];
  }
  if (cross(ab, ac) !== 0) return [];
  const axis = Math.abs(ab[0]) >= Math.abs(ab[1]) ? 0 : 1;
  const ends = [(c[axis] - a[axis]) / ab[axis], (d[axis] - a[axis]) / ab[axis]].sort((x, y) => x - y);
  const low = Math.max(0, ends[0]);
  const high = Math.min(1, ends[1]);
  return low <= high ? [low, high] : [];
}

const edges = (ring: Ring): Array<[Vertex, Vertex]> => ring.slice(0, -1).map((point, i) => [point, ring[i + 1]]);

function contains(point: Vertex, polygon: Array<[Vertex, Vertex]>): boolean {
  const [x, y] = point;
  let inside = false;
  for (const [a, b] of polygon) {
    if (cross(subtract(b, a), subtract(point, a)) === 0 && between(a[0], b[0], x) && between(a[1], b[1], y)) return true;
    if ((a[1] > y) !== (b[1] > y) && x < along(a, b, (y - a[1]) / (b[1] - a[1]))[0]) inside = !inside;
  }
  return inside;
}

export function closePlantingSketch(parcel: Boundary, vertices: Ring): Result {
  const first = vertices[0];
  if (!first || new Set(vertices.map(([x, y]) => `${x},${y}`)).size !== vertices.length) return { ok: false, reason: 'invalid' };
  const boundary: Boundary = { type: 'Polygon', coordinates: [[...vertices, first]] };
  if (!validBoundary(parcel) || !validBoundary(boundary)) return { ok: false, reason: 'invalid' };
  const outline = edges(boundary.coordinates[0]);
  for (const [[a, b], i] of outline.map((edge, j) => [edge, j] as const)) {
    for (let j = i + 1; j < outline.length; j += 1) {
      const hits = edgeCuts(a, b, ...outline[j]);
      const adjacent = j === i + 1 || i === 0 && j === outline.length - 1;
      if (adjacent ? hits.length > 1 && hits[0] !== hits[1] : hits.length > 0) return { ok: false, reason: 'invalid' };
    }
  }

  const parcelEdges = edges(parcel.coordinates[0]);
  if (!vertices.every((p) => contains(p, parcelEdges))) return { ok: false, reason: 'outside' };
  for (const [a, b] of outline) {
    const cuts = [0, ...parcelEdges.flatMap(([c, d]) => edgeCuts(a, b, c, d)), 1].sort((x, y) => x - y);
    if (cuts.slice(1).some((t, i) => !contains(along(a, b, (t + cuts[i]) / 2), parcelEdges))) return { ok: false, reason: 'outside' };
  }
  const area = areaM2(boundary);
  if (area === undefined || area <= 0) return { ok: false, reason: 'invalid' };
  return { ok: true, boundary, stremma: toStremma(area) };
}
