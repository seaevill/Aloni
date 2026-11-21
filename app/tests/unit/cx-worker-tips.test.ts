import { expect, it } from 'vitest';
import { CATALOG } from '../../src/crops/catalog';
import el from '../../src/content/worker-tips/el.json';
import hi from '../../src/content/worker-tips/hi.json';

it('has one short Greek source and Hindi tip per crop', () => {
  for (const tips of [el, hi]) {
    expect(Object.keys(tips).sort()).toEqual(CATALOG.map(({ slug }) => slug).sort());
    for (const tip of Object.values(tips)) {
      expect(tip.trim().length).toBeGreaterThan(0);
      expect(tip.length).toBeLessThanOrEqual(150);
      expect(tip).not.toMatch(/\n|\p{Number}|https?:|\bsafe\b|ασφαλ[έε]ς|\bgüvenli\b|सुरक्षित/iu);
    }
  }
});
