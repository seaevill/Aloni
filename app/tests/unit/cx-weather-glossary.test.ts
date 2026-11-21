import { expect, it } from 'vitest';
import { weatherExplanation } from '../../src/content/weather';

it('explains all six weather terms in four locales without decisions', () => {
  for (const locale of ['el', 'tr', 'en', 'hi'] as const) {
    for (const key of ['gusts', 'dewPoint', 'leafWetness', 'rain', 'soilTemperature', 'frost']) {
      const entry = weatherExplanation(key, locale);
      expect(entry).toBeDefined();
      expect(entry!.trim().length).toBeGreaterThan(0);
      expect(entry!.length).toBeLessThanOrEqual(220);
      expect(entry).not.toMatch(/\bsafe\b|ασφαλ[έε]ς|\bgüvenli\b|\bspray\b|ψεκά|\p{Number}|https?:/iu);
    }
  }
  expect(weatherExplanation('__proto__', 'en')).toBeUndefined();
});
