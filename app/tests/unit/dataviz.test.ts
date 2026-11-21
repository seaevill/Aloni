import { describe, expect, it } from 'vitest';
import { sparklineSegments, weekDelta, weekScale } from '../../src/ui/ds/dataviz';

describe('Sparkline geometry (null is a gap, never zero)', () => {
  it('[3, null, 5] draws TWO segments: the missing value breaks the line', () => {
    const s = sparklineSegments([3, null, 5], 120, 32);
    expect(s.segments).toHaveLength(2);
    expect(s.segments.every((seg) => seg.length === 1)).toBe(true);          // each side is one lone point: it is drawn as a dot, not joined
    expect(s.last).toEqual(s.segments[1]![0]);
  });
  it('a missing value is never plotted at the baseline: 0 and null look different', () => {
    const withZero = sparklineSegments([3, 0, 5], 120, 32);
    const withNull = sparklineSegments([3, null, 5], 120, 32);
    expect(withZero.segments).toHaveLength(1);
    expect(withZero.segments[0]).toHaveLength(3);
    expect(withNull.segments).toHaveLength(2);
  });
  it('all values missing: nothing is drawn; one known value: one point; a flat series sits in the middle', () => {
    expect(sparklineSegments([null, null], 120, 32)).toEqual({ segments: [], last: undefined });
    expect(sparklineSegments([null, 4, null], 120, 32).segments).toHaveLength(1);
    const flat = sparklineSegments([2, 2, 2], 120, 32).segments[0]!;
    expect(new Set(flat.map((p) => p[1])).size).toBe(1);
  });
  it('points stay inside the box (with a margin for the dot) and x grows with the position', () => {
    const { segments } = sparklineSegments([1, 9, 4, 7], 120, 32);
    const pts = segments.flat();
    for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(3); expect(x).toBeLessThanOrEqual(117); expect(y).toBeGreaterThanOrEqual(3); expect(y).toBeLessThanOrEqual(29); }
    expect(pts.map((p) => p[0])).toEqual([...pts.map((p) => p[0])].sort((a, b) => a - b));
  });
});

describe('WeekBars arithmetic (held and unknown supply are never added to the total)', () => {
  it('short / extra / even only when BOTH orders and eligible supply are known', () => {
    expect(weekDelta(100, 80)).toEqual({ kind: 'short', n: 20 });
    expect(weekDelta(60, 80)).toEqual({ kind: 'extra', n: 20 });
    expect(weekDelta(80, 80)).toEqual({ kind: 'even', n: 0 });
    expect(weekDelta(null, 80)).toBeUndefined();
    expect(weekDelta(100, null)).toBeUndefined();
  });
  it('the scale is the largest KNOWN number of the weeks (orders, eligible, unknown shown separately); no data = no scale', () => {
    expect(weekScale([{ orders: 10, eligible: 30, unknown: 5 }, { orders: null, eligible: null, unknown: 50 }])).toBe(50);
    expect(weekScale([{ orders: null, eligible: null, unknown: null }])).toBeUndefined();
  });
});
