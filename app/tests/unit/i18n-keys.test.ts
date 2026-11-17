import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dictionaries } from '../../src/i18n';
import { findI18nProblems, type Dicts } from './helpers/i18n-check';

const SRC = new URL('../../src/', import.meta.url).pathname;
const source = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'))
  .map((f) => readFileSync(join(SRC, f), 'utf8'))
  .join('\n');
const real: Dicts = { el: dictionaries.el, tr: dictionaries.tr, en: dictionaries.en };

describe('i18n keys (real files)', () => {
  const p = findI18nProblems(real, source);
  it('every t("literal") key exists in el, tr and en', () => expect(p.missingInDict).toEqual([]));
  it('no dead keys: every key is spelled out as a quoted literal in src (no dynamic keys)', () => expect(p.deadKeys).toEqual([]));
  it('tr and en have exactly the same keys as el', () => expect(p.keySetMismatch).toEqual([]));
  it('{placeholders} match across languages', () => expect(p.placeholderMismatch).toEqual([]));
});

describe('i18n checks go red on bad input (negative tests)', () => {
  const dicts: Dicts = { el: { a: 'α {n}', b: 'β' }, tr: { a: 'a {n}', b: 'b' }, en: { a: 'a {n}', b: 'b' } };
  const code = "t('a'); t('b');";
  it('baseline is clean', () => expect(findI18nProblems(dicts, code)).toEqual({ missingInDict: [], deadKeys: [], keySetMismatch: [], placeholderMismatch: [] }));
  it('a key used in code but missing from a language', () => {
    expect(findI18nProblems(dicts, `${code} t('zzz');`).missingInDict).toEqual(['el:zzz', 'tr:zzz', 'en:zzz']);
    const missingTr: Dicts = { ...dicts, tr: { a: 'a {n}' } };
    expect(findI18nProblems(missingTr, code).keySetMismatch).toEqual(['tr:b']);
  });
  it('a dead (unused) key', () => {
    const withDead: Dicts = { el: { ...dicts.el, dead: 'x' }, tr: { ...dicts.tr, dead: 'x' }, en: { ...dicts.en, dead: 'x' } };
    expect(findI18nProblems(withDead, code).deadKeys).toEqual(['dead']);
  });
  it('a key that only tr or en has', () => {
    const extra: Dicts = { ...dicts, en: { ...dicts.en, only_en: 'x' } };
    expect(findI18nProblems(extra, code).keySetMismatch).toEqual(['el:only_en', 'tr:only_en']);
  });
  it('a placeholder that differs', () => {
    const bad: Dicts = { ...dicts, tr: { a: 'a {m}', b: 'b' } };
    expect(findI18nProblems(bad, code).placeholderMismatch).toEqual(['tr:a']);
  });
});
