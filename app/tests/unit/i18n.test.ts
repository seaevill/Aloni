import { describe, expect, it } from 'vitest';
import { dictionaries, formatArea, formatDate, lang } from '../../src/i18n';

describe('i18n', () => {
  it('el/tr/en have identical key sets', () => {
    const keys = (l: 'el' | 'tr' | 'en') => Object.keys(dictionaries[l]).sort();
    expect(keys('tr')).toEqual(keys('el'));
    expect(keys('en')).toEqual(keys('el'));
  });
  it('no empty strings', () => {
    for (const d of Object.values(dictionaries)) for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
  });
  it('uses Greek formats by default', () => {
    expect(lang.value).toBe('el');
    expect(formatArea(0.6)).toBe('0,6 στρ.');
    expect(formatDate('2026-11-16')).toBe('Δευ 16 Νοε');
  });
});
