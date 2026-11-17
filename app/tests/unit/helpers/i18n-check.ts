// Pure checks used by i18n-keys.test.ts (on the real files) and by its negative tests (on synthetic input),
// so the checks themselves are proven to go red.
export type Dicts = Record<'el' | 'tr' | 'en', Record<string, string>>;

export interface Problems {
  missingInDict: string[]; // used in code as t('key') but not in some language ("lang:key")
  deadKeys: string[]; // in el but never spelled out as a string literal in the source
  keySetMismatch: string[]; // keys that exist in only some of el/tr/en
  placeholderMismatch: string[];
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

export function findI18nProblems(dicts: Dicts, source: string): Problems {
  const used = [...source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const missingInDict: string[] = [];
  for (const k of used) for (const l of ['el', 'tr', 'en'] as const) if (!(k in dicts[l])) missingInDict.push(`${l}:${k}`);

  const spelled = (k: string) => source.includes(`'${k}'`) || source.includes(`"${k}"`);
  // a plural form (`sync.pending.one` / `.other`) is used when tn('sync.pending', n) spells out its base
  const deadKeys = Object.keys(dicts.el).filter((k) => !spelled(k) && !(/\.(zero|one|two|few|many|other)$/.test(k) && spelled(k.replace(/\.[a-z]+$/, ''))));

  const all = new Set([...Object.keys(dicts.el), ...Object.keys(dicts.tr), ...Object.keys(dicts.en)]);
  const keySetMismatch: string[] = [];
  for (const k of all) for (const l of ['el', 'tr', 'en'] as const) if (!(k in dicts[l])) keySetMismatch.push(`${l}:${k}`);

  const placeholderMismatch: string[] = [];
  for (const k of Object.keys(dicts.el)) {
    for (const l of ['tr', 'en'] as const) if (k in dicts[l] && placeholders(dicts[l][k]) !== placeholders(dicts.el[k])) placeholderMismatch.push(`${l}:${k}`);
  }
  return { missingInDict, deadKeys, keySetMismatch, placeholderMismatch };
}
