import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/crops/catalog';
import { DRAWINGS } from '../../src/ui/illustrations/crops/shapes';

// D6: every crop Bora grows has its own small drawing; each is tiny; only path data (no colours, no text, no images).
describe('crop illustrations', () => {
  it('there is a drawing for every catalog slug and none for a slug that does not exist', () => {
    expect(Object.keys(DRAWINGS).sort()).toEqual(CATALOG.map((c) => c.slug).sort());
    expect(CATALOG).toHaveLength(17);
  });
  it('each drawing is at most 1.5 KB and holds only path commands and numbers (no colour, text or image data)', () => {
    for (const [slug, d] of Object.entries(DRAWINGS)) {
      expect(d.shapes.length + d.lines.length, slug).toBeLessThanOrEqual(1500);
      for (const part of [d.shapes, d.lines]) expect(part, slug).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*$/);
      expect(d.shapes.length, slug).toBeGreaterThan(20);
    }
  });
  it('no two crops share the same drawing', () => {
    const all = Object.values(DRAWINGS).map((d) => d.shapes + d.lines);
    expect(new Set(all).size).toBe(all.length);
  });
});
