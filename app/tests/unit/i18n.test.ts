import { describe, expect, it } from 'vitest';
import { dictionaries, formatDate, formatDateLong, formatDateTime, lang, ts, ensureAllLangs } from '../../src/i18n';
await ensureAllLangs();      // tr, en and hi are loaded on demand in the app; the checks compare all of them

describe('i18n', () => {
  it('el/tr/en have identical key sets', () => {
    const keys = (l: 'el' | 'tr' | 'en') => Object.keys(dictionaries[l]).sort();
    expect(keys('tr')).toEqual(keys('el'));
    expect(keys('en')).toEqual(keys('el'));
  });
  it('no empty strings', () => {
    for (const d of Object.values(dictionaries)) for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
  });
  it('hi (Hindi, the worker screens) is a subset of el with the SAME placeholders, and covers every worker.* key', () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const [k, v] of Object.entries(dictionaries.hi)) { expect(dictionaries.el, k).toHaveProperty([k]); expect(holes(v), k).toBe(holes(dictionaries.el[k]!)); }
    expect(Object.keys(dictionaries.el).filter((k) => k.startsWith('worker.') && !(k in dictionaries.hi))).toEqual([]);
  });
  it('the Hindi safety texts are shown TOGETHER with the Greek ones, and the translation is marked «προς έλεγχο»', () => {
    lang.value = 'hi';
    try {
      expect(ts('worker.lock.unknown')).toBe(`${dictionaries.hi['worker.lock.unknown']}\n${dictionaries.el['worker.lock.unknown']}`);
      expect(ts('worker.lock.running', { d: 'Πεμ 20 Νοε' })).toContain('Μην μπείτε στο χωράφι μέχρι Πεμ 20 Νοε');
      expect(dictionaries.hi['lang.review']).toContain('προς έλεγχο');
    } finally { lang.value = 'el'; }
    expect(ts('worker.lock.unknown')).toBe(dictionaries.el['worker.lock.unknown']);   // other languages: the text as it is
  });
  it('long Greek dates use the genitive month', () => {
    expect(formatDateLong('2026-11-16')).toBe('Δευτέρα 16 Νοεμβρίου 2026');
  });
  it('Greek times are on the 24-hour clock (no «π.μ.» / «μ.μ.»), Athens time', () => {
    expect(formatDateTime('2026-11-20T08:00:00Z')).toContain('10:00');
    expect(formatDateTime('2026-11-20T19:30:00Z')).toContain('21:30');
    expect(formatDateTime('2026-11-20T19:30:00Z')).not.toMatch(/π\.μ\.|μ\.μ\./);
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
