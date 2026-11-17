import { signal } from '@preact/signals';
import el from './el.json';
import tr from './tr.json';
import en from './en.json';
import sq from './sq.json';
import { TZ } from '../config';
import { fill, pluralKey, type Params } from './plural';

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

const lookup = (key: string) => dictionaries[lang.value][key] ?? dictionaries.el[key] ?? key;

export function t(key: I18nKey, params?: Params): string {
  return fill(lookup(key), params);
}

/** Keys that come in `.one` / `.other` pairs, e.g. `time.daysAgo.one` + `time.daysAgo.other` → base `time.daysAgo`. */
export type PluralBase = { [K in I18nKey]: K extends `${infer B}.other` ? B : never }[I18nKey];

/** Plural-aware translation: `tn('time.daysAgo', 3)` picks the right form for the current language; `{n}` is filled in. */
export function tn(base: PluralBase, n: number, params?: Params): string {
  const has = (k: string) => k in dictionaries[lang.value] || k in dictionaries.el;
  return fill(lookup(pluralKey(LOCALES[lang.value], base, n, has)), { ...params, n });
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

/** A UTC second «2026-11-20T08:00:00Z» -> «20 Νοε, 10:00» in Europe/Athens; an unusable value prints nothing made up (the caller shows «unknown»). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? t('value.unknown') : new Intl.DateTimeFormat(LOCALES[lang.value], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d);
}
