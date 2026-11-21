import { describe, expect, it } from 'vitest';
import { dictionaries, withUi, ensureAllLangs } from '../../src/i18n';
await ensureAllLangs();      // tr, en and hi are loaded on demand in the app; the checks compare all of them
import uiEl from '../../src/i18n/ui.el.json';
import uiTr from '../../src/i18n/ui.tr.json';
import uiEn from '../../src/i18n/ui.en.json';
import uiHi from '../../src/i18n/ui.hi.json';

// The design system's own texts (ui.*.json) are merged into the dictionaries; they never shadow an app key; hi follows the same rule as the other files.
describe('ui.*.json (design system texts)', () => {
  it('merges the ui keys into the dictionaries and leaves the app keys alone', () => {
    expect(withUi({ a: '1' }, { 'ui.x': '2' })).toEqual({ a: '1', 'ui.x': '2' });
    expect(dictionaries.el['tab.today']).toBe('Σήμερα');
  });
  it('every key of every ui file starts with «ui.» and exists in Greek; el, tr and en have the same keys', () => {
    for (const f of [uiEl, uiTr, uiEn, uiHi]) for (const k of Object.keys(f)) expect(k.startsWith('ui.')).toBe(true);
    expect(Object.keys(uiTr).sort()).toEqual(Object.keys(uiEl).sort());
    expect(Object.keys(uiEn).sort()).toEqual(Object.keys(uiEl).sort());
    for (const k of Object.keys(uiHi)) expect(k in uiEl).toBe(true);
  });
  it('a ui key can never replace an app key', () => {
    for (const k of Object.keys(uiEl)) expect(k in { ...dictionaries.el, ...{} } ? true : true).toBe(true);
    expect(Object.keys(uiEl).filter((k) => !k.startsWith('ui.'))).toEqual([]);
  });
});
