// Pure helpers behind t()/tn(): fill ALL {placeholders}, and pick the plural form of a key.
// Greek, Turkish and English each have "one" and "other" (Intl.PluralRules decides, per language).
export type Params = Record<string, string | number>;

/** Replaces every {name} (all occurrences); an unknown placeholder is left visible instead of silently disappearing. */
export function fill(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** `base.one` / `base.other` ...: the key for n in this language, falling back to `base.other`. */
export function pluralKey(locale: string, base: string, n: number, has: (key: string) => boolean): string {
  const category = new Intl.PluralRules(locale).select(n);
  return has(`${base}.${category}`) ? `${base}.${category}` : `${base}.other`;
}
