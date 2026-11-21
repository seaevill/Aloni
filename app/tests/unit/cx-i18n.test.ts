import { afterEach, describe, expect, it } from 'vitest';
import { tx } from '../../src/content/tx';
import { lang } from '../../src/i18n';
import el from '../../src/i18n/cx.el.json';
import en from '../../src/i18n/cx.en.json';
import hi from '../../src/i18n/cx.hi.json';
import tr from '../../src/i18n/cx.tr.json';
import { UNKNOWN_REASONS } from '../../src/ui/cx/UnknownWhy';

describe('Sprint 2 source strings', () => {
  afterEach(() => { lang.value = 'el'; });

  it('has prefix and key parity without prohibited safety claims', () => {
    const keys = Object.keys(el).sort();
    expect(keys.every((key) => key.startsWith('cx.'))).toBe(true);
    for (const dict of [el, tr, en, hi]) {
      expect(Object.keys(dict).sort()).toEqual(keys);
      expect(Object.values(dict).join(' ')).not.toMatch(/\bsafe\b|ασφαλ|güvenli/iu);
      for (const key of Object.values(UNKNOWN_REASONS)) expect(dict[key]).toBeTruthy();
    }
  });

  it('uses the current locale and substitutes source facts only', () => {
    expect(tx('cx.source.count.other', { n: '6' })).toBe('από 6 καταγραφές');
    lang.value = 'tr';
    expect(tx('cx.source.count.other', { n: '6' })).toBe('6 kayıttan');
    lang.value = 'en';
    expect(tx('cx.source.last', { date: 'Fri 20 Nov' })).toBe('last recorded Fri 20 Nov');
  });
});
