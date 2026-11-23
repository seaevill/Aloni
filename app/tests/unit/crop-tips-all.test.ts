import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/crops/catalog';
import { cropContent } from '../../src/content/crops';

describe('the tips card has content for EVERY crop of the catalogue, in el, tr and en', () => {
  for (const locale of ['el', 'tr', 'en'] as const) {
    it(locale, () => {
      for (const c of CATALOG) {
        const x = cropContent(c.slug, locale);
        expect(x, `${locale}/${c.slug}`).toBeDefined();
        expect(x!.facts.length, `${locale}/${c.slug} facts`).toBeGreaterThanOrEqual(3);
        expect(x!.history.length + x!.tips.length, `${locale}/${c.slug} text`).toBeGreaterThan(0);
      }
    });
  }
});
