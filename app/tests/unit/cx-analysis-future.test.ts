import { expect, it } from 'vitest';
import { futureAnalysis } from '../../src/content/analyses-future';

it('covers each planned measurement in four locales without thresholds', () => {
  for (const locale of ['el', 'tr', 'en', 'hi'] as const) {
    for (const key of ['om', 'n', 'p', 'k', 'caco3', 'sodium', 'sar', 'cl', 'no3', 'ec', 'ph']) {
      const entry = futureAnalysis(key, locale);
      expect(entry).toBeDefined();
      expect(Object.keys(entry!)).toEqual(['what', 'changes', 'effect']);
      for (const value of Object.values(entry!)) {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value.length).toBeLessThanOrEqual(220);
        expect(value).not.toMatch(/\bsafe\b|ασφαλ[έε]ς|\bgüvenli\b|\p{Number}|https?:/iu);
      }
    }
  }
  expect(futureAnalysis('constructor', 'el')).toBeUndefined();
});
