import { lang } from '../i18n';
import el from '../i18n/cx.el.json';
import en from '../i18n/cx.en.json';
import hi from '../i18n/cx.hi.json';
import tr from '../i18n/cx.tr.json';

export type CxKey = keyof typeof el;
const dictionaries: Record<string, Partial<Record<CxKey, string>>> = { el, en, hi, tr };

export function tx(key: CxKey, params: Readonly<Record<string, string>> = {}): string {
  const template = dictionaries[lang.value]?.[key] ?? el[key];
  return template.replace(/\{([a-z]+)\}/g, (slot, name: string) => params[name] ?? slot);
}
