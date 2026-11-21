import { describe, expect, it } from 'vitest';
import ring from '../../src/ui/brand/ring.json';

// D7: the mark is ONE geometry file: 12 stones in a ring round a centre disc; the maskable icon keeps the ring inside the 80 % safe zone.
describe('the mark geometry', () => {
  it('has exactly 12 stones, 30 degrees apart, on a circle round the centre', () => {
    expect(ring.stones).toHaveLength(12);
    ring.stones.forEach((s, i) => {
      expect(s.rot).toBe(i * 30);
      expect(Math.hypot(s.cx - 50, s.cy - 50)).toBeCloseTo(ring.ring, 1);
      expect(s.x + ring.stoneW / 2).toBeCloseTo(s.cx, 1);
      expect(s.y + ring.stoneH / 2).toBeCloseTo(s.cy, 1);
    });
  });
  it('the stones do not touch each other (a seam between neighbours) and the disc sits inside the ring', () => {
    const chord = 2 * ring.ring * Math.sin(Math.PI / 12);
    expect(chord).toBeGreaterThan(ring.stoneW);
    expect(ring.disc).toBeLessThan(ring.ring - ring.stoneH / 2);
  });
  it('the outermost corner of the ring is within 41.7 % of the box, so a 90 % mark fits the maskable 80 % circle', () => {
    const outer = Math.hypot(ring.ring + ring.stoneH / 2, ring.stoneW / 2);
    expect(outer).toBeLessThanOrEqual(41.8);
    expect(0.9 * outer).toBeLessThanOrEqual(40);
  });
});
