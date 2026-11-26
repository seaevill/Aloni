import type { Ring } from '../../map/geo';

// Small helpers to cut a hand-drawn parcel outline into side-by-side strips (the planting's own drawn outline). Pure.
const clip = (ring: Ring, keep: (p: [number, number]) => number): Ring => {   // Sutherland–Hodgman against ONE half-plane: keep(p) >= 0 is inside
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!; const b = ring[i + 1] ?? ring[0]!; const ka = keep(a); const kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) { const t = ka / (ka - kb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
};
/** The slice `index` of `parts` (west to east) of a closed ring, shrunk a little from the edges so it lies INSIDE the parcel; the ring is closed again. */
export function strip(closed: number[][], index: number, parts: number, margin: number): Ring {
  const ring = closed.slice(0, -1).map((c) => [c[0]!, c[1]!] as [number, number]);
  const xs = ring.map((p) => p[0]); const x0 = Math.min(...xs); const x1 = Math.max(...xs); const w = x1 - x0;
  const a = x0 + (w * index) / parts + (index === 0 ? w * margin : w * margin / 2); const b = x0 + (w * (index + 1)) / parts - (index === parts - 1 ? w * margin : w * margin / 2);
  const cut = clip(clip(ring, (p) => p[0] - a), (p) => b - p[0]);
  const ys = ring.map((p) => p[1]); const y0 = Math.min(...ys); const y1 = Math.max(...ys); const h = y1 - y0;
  const inner = clip(clip(cut, (p) => p[1] - (y0 + h * margin)), (p) => (y1 - h * margin) - p[1]);
  return [...inner, inner[0]!];
}
export function insideRing(p: [number, number], closed: number[][]): boolean {      // ray casting; edges count as inside for the purposes of the check
  let inside = false;
  for (let i = 0, j = closed.length - 1; i < closed.length; j = i++) {
    const [xi, yi] = closed[i] as [number, number]; const [xj, yj] = closed[j] as [number, number];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Inside, or on an edge (the cut outlines touch the parcel edge; touching is fine). Tolerance 1e-6 degrees (≈ 10 cm: the outlines are rounded to 6 decimals). */
export function insideOrOnEdge(p: [number, number], closed: number[][]): boolean {
  if (insideRing(p, closed)) return true;
  for (let i = 0; i < closed.length - 1; i++) {
    const [ax, ay] = closed[i] as [number, number]; const [bx, by] = closed[i + 1] as [number, number];
    const dx = bx - ax; const dy = by - ay; const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2));
    if (Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)) <= 1e-6) return true;
  }
  return false;
}
