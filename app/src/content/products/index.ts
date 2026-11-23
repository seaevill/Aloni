import type { Lang } from '../../i18n';

type ProductDictionary = Readonly<Record<string, readonly string[]>>;
const locales = {
  el: () => import('./el.json'),
  en: () => import('./en.json'),
  hi: () => import('./hi.json'),
  tr: () => import('./tr.json'),
};

/** Match the recorded substance and its recorded class. Product labels are separate. */
function lookup(dictionary: ProductDictionary, active: unknown, type: unknown): string | undefined {
  if (typeof active !== 'string') return undefined;
  const key = active.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const entry = dictionary[key];
  return entry?.[0] === type ? entry?.[1] : undefined;
}


export async function productKnowledge(active: unknown, type: unknown, language: Lang): Promise<string | undefined> {
  return lookup((await locales[language]()).default, active, type);
}
