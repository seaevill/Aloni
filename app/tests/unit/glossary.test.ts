import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dictionaries } from '../../src/i18n';

// docs/i18n/glossary-el.md holds a ```banned block: `regex | scope | reason`.
const doc = readFileSync(new URL('../../../docs/i18n/glossary-el.md', import.meta.url), 'utf8');
const block = /```banned\n([\s\S]*?)```/.exec(doc)?.[1] ?? '';
// Patterns and texts are both folded (lower case, no accents/diaeresis), otherwise «προϊόντα» would never match.
const fold = (s: string) => s.replace(/\u00ad/g, '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(); // soft hyphens (tab labels) are not part of the word
const rules = block.split('\n').filter((l) => l.trim()).map((l) => {
  const [re, scope, reason] = l.split('|').map((x) => x.trim());
  return { re: new RegExp(fold(re), 'u'), scope, reason };
});

describe('Greek glossary', () => {
  it('has banned patterns', () => expect(rules.length).toBeGreaterThanOrEqual(7));
  for (const r of rules) {
    it(`no ${r.re.source} in ${r.scope}`, () => {
      const keys = r.scope === '*' ? Object.keys(dictionaries.el).filter((k) => !k.startsWith('why.')) : r.scope.split(',').map((k) => k.trim());
      for (const k of keys) expect(fold(dictionaries.el[k] ?? ''), `${k}: ${r.reason}`).not.toMatch(r.re);
    });
  }
  it('the crops tab says «Καλλιέργειες»', () => {
    expect(dictionaries.el['tab.crops'].replace(/\u00ad/g, '')).toBe('Καλλιέργειες');
    expect(dictionaries.el['crops.title']).toBe('Καλλιέργειες');
  });
});
