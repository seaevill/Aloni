import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dictionaries } from '../../src/i18n';

const SRC = new URL('../../src/', import.meta.url).pathname;
const files = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'))
  .map((f) => readFileSync(join(SRC, f), 'utf8'));
const source = files.join('\n');
const keys = Object.keys(dictionaries.el);

describe('i18n keys', () => {
  it('every t("literal") key exists in el, tr and en', () => {
    const used = [...source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const k of used) for (const l of ['el', 'tr', 'en'] as const) expect(dictionaries[l], `${k} missing in ${l}`).toHaveProperty([k]);
  });
  it('no dead keys: every dictionary key appears as a quoted literal in src (spell dynamic keys out)', () => {
    const dead = keys.filter((k) => !source.includes(`'${k}'`) && !source.includes(`"${k}"`));
    expect(dead).toEqual([]);
  });
  it('{placeholders} match across languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const k of keys) {
      expect(ph(dictionaries.tr[k]), `${k} tr`).toBe(ph(dictionaries.el[k]));
      expect(ph(dictionaries.en[k]), `${k} en`).toBe(ph(dictionaries.el[k]));
    }
  });
});
