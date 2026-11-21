import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/crops/catalog';
import { cropContent } from '../../src/content/crops';
import el from '../../src/content/crops/el.json';
import en from '../../src/content/crops/en.json';
import tr from '../../src/content/crops/tr.json';

describe('crop reading library', () => {
  for (const [locale, dictionary] of Object.entries({ el, en, tr })) {
    it(`covers the entire catalogue in ${locale}`, () => {
      expect(Object.keys(dictionary).sort()).toEqual(CATALOG.map(({ slug }) => slug).sort());
      for (const item of Object.values(dictionary)) {
        expect(item.history.split(/[.!?]+/u).filter((sentence) => sentence.trim())).toHaveLength(2);
        expect(item.facts).toHaveLength(3);
        const fields: Array<readonly [string, number]> = [[item.history, 300], [item.tips, 200], [item.strength, 80], [item.weakness, 80],
          ...item.facts.map((value) => [value, 130] as const), ...item.problems.map((value) => [value, 80] as const)];
        for (const [value, max] of fields) {
          expect(value.trim().length).toBeGreaterThan(0);
          expect(value.length).toBeLessThanOrEqual(max);
          expect(value).not.toMatch(/\bsafe\b|ασφαλ[έε]ς|\bgüvenli\b|\p{Number}|https?:/iu);
        }
      }
    });
  }
  it('returns unknown for an uncatalogued slug', () => {
    expect(cropContent('constructor', 'el')).toBeUndefined();
    expect(cropContent('spinach', 'tr')?.facts).toHaveLength(3);
  });
});
