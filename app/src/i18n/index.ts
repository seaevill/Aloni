import { signal } from '@preact/signals';
import el from './el.json';
import tr from './tr.json';
import en from './en.json';
import hi from './hi.json';
import { TZ } from '../config';
import { fill, pluralKey, type Params } from './plural';

export type Lang = 'el' | 'tr' | 'en' | 'hi';
export const LANGS: Lang[] = ['el', 'tr', 'en', 'hi'];
/**
 * One line per language: the locale (dates, plurals) and the label on its button (the language's OWN name for a non-Latin script). Hindi covers the WORKER screens (Bora 2026-11-19, instead of
 * Albanian); a key it does not have falls back to Greek. Adding Punjabi (Gurmukhi) = `pa.json`, an entry here, a font block in ui/fonts.css and a `--font-pa` token.
 */
export const LANG_META: Record<Lang, { locale: string; label: string }> = { el: { locale: 'el-GR', label: 'EL' }, tr: { locale: 'tr-TR', label: 'TR' }, en: { locale: 'en-GB', label: 'EN' }, hi: { locale: 'hi-IN', label: 'हिन्दी' } };
export const dictionaries: Record<Lang, Record<string, string>> = { el, tr, en, hi };
const LOCALES: Record<Lang, string> = { el: LANG_META.el.locale, tr: LANG_META.tr.locale, en: LANG_META.en.locale, hi: LANG_META.hi.locale };

function initialLang(): Lang {
  try {
    const s = localStorage.getItem('lang');
    if (s === 'el' || s === 'tr' || s === 'en' || s === 'hi') return s;
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

/** A SAFETY message (a lock, a waiting period): in Hindi it is shown TOGETHER with the Greek text until a native speaker has approved the translation, so a mistranslation is never the only thing a worker reads. */
export function ts(key: I18nKey, params?: Params): string {
  const own = t(key, params);
  return lang.value === 'hi' ? `${own}\n${fill(dictionaries.el[key] ?? key, params)}` : own;
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
  return Number.isNaN(d.getTime()) ? t('value.unknown') : new Intl.DateTimeFormat(LOCALES[lang.value], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(d); // 24-hour clock (Greek 12-hour «π.μ. μ.μ.» was hard to read)
}

/** «2026-11-20 10:00» in Europe/Athens (for records and exports: unambiguous in every language). */
export function formatLocalIso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}
