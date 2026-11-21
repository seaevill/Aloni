// Pure geometry and arithmetic of the data-viz components. A missing value (null) is a GAP: it is never drawn as 0 and never added to a total.
export type Point = readonly [number, number];
const MARGIN = 3;   // room for the 6 px end dot

/** The points of a sparkline in a w×h box, split into segments at every missing value. `last` is the final known point (it gets the dot). */
export function sparklineSegments(values: ReadonlyArray<number | null>, w: number, h: number): { segments: Point[][]; last: Point | undefined } {
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (known.length === 0) return { segments: [], last: undefined };
  const lo = known.reduce((a, b) => (b < a ? b : a)); const hi = known.reduce((a, b) => (b > a ? b : a));
  const span = hi - lo;
  const gaps = Math.max(values.length - 1, 1);
  const xAt = (i: number): number => MARGIN + (i * (w - 2 * MARGIN)) / gaps;   // one value sits at the left margin
  const segments: Point[][] = []; let cur: Point[] = []; let last: Point | undefined;
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) { if (cur.length) segments.push(cur); cur = []; return; }
    const y = span === 0 ? h / 2 : h - MARGIN - ((v - lo) / span) * (h - 2 * MARGIN);
    const p: Point = [xAt(i), y]; cur.push(p); last = p;
  });
  if (cur.length) segments.push(cur);
  return { segments, last };
}

export interface Week { orders: number | null; eligible: number | null; unknown: number | null }
/** Short / extra / even, only when BOTH numbers are known. Held and unknown supply never count as eligible. */
export function weekDelta(orders: number | null, eligible: number | null): { kind: 'short' | 'extra' | 'even'; n: number } | undefined {
  if (orders === null || eligible === null) return undefined;
  if (orders > eligible) return { kind: 'short', n: orders - eligible };
  if (orders < eligible) return { kind: 'extra', n: eligible - orders };
  return { kind: 'even', n: eligible - orders };
}
/** The largest KNOWN number across the weeks (the bars' scale); undefined when nothing is known. */
export function weekScale(weeks: readonly Week[]): number | undefined {
  const all = weeks.flatMap((w) => [w.orders, w.eligible, w.unknown]).filter((v): v is number => v !== null && Number.isFinite(v));
  return all.length === 0 ? undefined : all.reduce((a, b) => (b > a ? b : a));
}
