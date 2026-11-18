import { describe, expect, it } from 'vitest';
import { dictionaries, formatDate, formatDateLong, lang } from '../../src/i18n';

describe('i18n', () => {
  it('el/tr/en have identical key sets', () => {
    const keys = (l: 'el' | 'tr' | 'en') => Object.keys(dictionaries[l]).sort();
    expect(keys('tr')).toEqual(keys('el'));
    expect(keys('en')).toEqual(keys('el'));
  });
  it('no empty strings', () => {
    for (const d of Object.values(dictionaries)) for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
  });
  it('sq (Albanian) is a subset of el with matching placeholders', () => {
    for (const k of Object.keys(dictionaries.sq)) expect(dictionaries.el, k).toHaveProperty([k]);
  });
  it('long Greek dates use the genitive month', () => {
    expect(formatDateLong('2026-11-16')).toBe('Δευτέρα 16 Νοεμβρίου 2026');
  });
  it('uses Greek formats by default', () => {
    expect(lang.value).toBe('el');
    expect(formatDate('2026-11-16')).toBe('Δευ 16 Νοε');
  });
});

describe('the worker status line does not promise what does not exist yet', () => {
  it('until the sync PR (16), «worker.queued» says nothing about signal: it is saved on the phone and will be sent when an account is connected', () => {
    for (const l of ['el', 'tr', 'en']) {
      const text = dictionaries[l as 'el' | 'tr' | 'en']['worker.queued'];
      expect(text, l).not.toMatch(/σήμα|sinyal|signal/i);
    }
  });
});
