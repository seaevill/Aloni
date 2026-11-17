import { signal } from '@preact/signals';
import el from './el.json';
import tr from './tr.json';
import en from './en.json';
import sq from './sq.json';
import { TZ } from '../config';

export type Lang = 'el' | 'tr' | 'en';
export const LANGS: Lang[] = ['el', 'tr', 'en'];
// `sq` (Albanian) is an empty file for now (workers choose el/tr/sq in M2); missing keys fall back to Greek.
export const dictionaries: Record<Lang | 'sq', Record<string, string>> = { el, tr, en, sq };
const LOCALES: Record<Lang, string> = { el: 'el-GR', tr: 'tr-TR', en: 'en-GB' };

function initialLang(): Lang {
  try {
    const s = localStorage.getItem('lang');
    if (s === 'el' || s === 'tr' || s === 'en') return s;
  } catch { /* storage may be unavailable */ }
  return 'el'; // Greek first
}

export const lang = signal<Lang>(initialLang());

export function setLang(l: Lang) {
  lang.value = l;
  try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
}

/** Every translation key, typed from the Greek file: a typo or a missing key is a compile error. */
export type I18nKey = keyof typeof el;

export function t(key: I18nKey, params?: Record<string, string | number>): string {
  let s = dictionaries[lang.value][key] ?? dictionaries.el[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** ISO date -> "Δευτέρα 16 Νοεμβρίου 2026" (month in the genitive in Greek) */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[lang.value], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
    .format(new Date(`${iso}T12:00:00Z`));
}

/** ISO date -> "Δευ 16 Νοε" in Europe/Athens */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[lang.value], { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
    .format(new Date(`${iso}T12:00:00Z`));
}
