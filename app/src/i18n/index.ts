import { langFromSearch } from '../auth/invite-link';
import { effect, signal } from '@preact/signals';
import el from './el.json';
import uiEl from './ui.el.json';
import { TZ } from '../config';
import { fill, pluralKey, type Params } from './plural';

export type Lang = 'el' | 'tr' | 'en' | 'hi';
export const LANGS: Lang[] = ['el', 'tr', 'en', 'hi'];
/**
 * One line per language: the locale (dates, plurals) and the label on its button (the language's OWN name for a non-Latin script). Hindi covers the WORKER screens (Bora 2026-11-19, instead of
 * Albanian); a key it does not have falls back to Greek. Adding Punjabi (Gurmukhi) = `pa.json`, an entry here, a font block in ui/fonts.css and a `--font-pa` token.
 */
export const LANG_META: Record<Lang, { locale: string; label: string }> = { el: { locale: 'el-GR', label: 'EL' }, tr: { locale: 'tr-TR', label: 'TR' }, en: { locale: 'en-GB', label: 'EN' }, hi: { locale: 'hi-IN', label: 'हिन्दी' } };
/** The design system's own texts live in `ui.<lang>.json` (every key starts with `ui.`) and are merged here, so two people never edit the same file (design sprint §2). */
export const withUi = (base: Record<string, string>, ui: Record<string, string>): Record<string, string> => ({ ...base, ...ui });
/** Greek is always there; the other languages are loaded when they are first needed (they are not part of the first load: JS budget). A missing key falls back to Greek. */
export const dictionaries: Record<Lang, Record<string, string>> = { el: withUi(el, uiEl), tr: {}, en: {}, hi: {} };
const LOADERS: Record<Exclude<Lang, 'el'>, () => Promise<Record<string, string>>> = {
  tr: async () => { const [a, b] = await Promise.all([import('./tr.json'), import('./ui.tr.json')]); return withUi(a.default, b.default); },
  en: async () => { const [a, b] = await Promise.all([import('./en.json'), import('./ui.en.json')]); return withUi(a.default, b.default); },
  hi: async () => { const [a, b] = await Promise.all([import('./hi.json'), import('./ui.hi.json')]); return withUi(a.default, b.default); },
};
const loading = new Map<Lang, Promise<void>>();
/** Loads the dictionary of a language (once). Greek is already loaded. */
export function ensureLang(l: Lang): Promise<void> {
  if (l === 'el' || Object.keys(dictionaries[l]).length > 0) return Promise.resolve();
  let p = loading.get(l);
  if (!p) { p = LOADERS[l]().then((d) => { Object.assign(dictionaries[l], d); }); loading.set(l, p); }
  return p;
}
/** Every dictionary (the tests and the checks compare all of them). */
export const ensureAllLangs = (): Promise<void[]> => Promise.all(LANGS.map(ensureLang));
const LOCALES: Record<Lang, string> = { el: LANG_META.el.locale, tr: LANG_META.tr.locale, en: LANG_META.en.locale, hi: LANG_META.hi.locale };

/** The first of the phone's languages we have a text for (hi, tr, en); nothing else matches: Greek stays the default. */
export function pickLang(preferred: readonly string[]): Lang {
  for (const p of preferred) {
    const code = p.toLowerCase().split('-')[0];
    if (code === 'el' || code === 'tr' || code === 'en' || code === 'hi') return code;
  }
  return 'el'; // Greek first
}
const isLang = (s: string | null): s is Lang => s === 'el' || s === 'tr' || s === 'en' || s === 'hi';

function initialLang(): Lang {
  try {
    const s = localStorage.getItem('lang');
    if (isLang(s)) return s;
  } catch { /* storage may be unavailable */ }
  try { const fromLink = langFromSearch(location.search); if (fromLink) return fromLink; } catch { /* no address (unit tests) */ }      // an invitation link opens the app in the invited person's language (only when no language was saved on this phone)
  try { return pickLang(navigator.languages ?? []); } catch { return 'el'; }
}

/** A worker's own language on her own phone: it applies while the worker view is open and never changes the owner's saved language. */
export const WORKER_LANG_KEY = 'worker_lang';
export function workerLang(): Lang | undefined {
  try { const s = localStorage.getItem(WORKER_LANG_KEY); return isLang(s) ? s : undefined; } catch { return undefined; }
}
export function setWorkerLang(l: Lang) { try { localStorage.setItem(WORKER_LANG_KEY, l); } catch { /* ignore */ } void ensureLang(l).then(() => { lang.value = l; }).catch(() => undefined); }
/** Back to the owner's language (the saved one, or the phone's default). */
export function restoreOwnerLang() {
  let l: Lang = 'el';
  try { const s = localStorage.getItem('lang'); l = isLang(s) ? s : pickLang(navigator.languages ?? []); } catch { l = 'el'; }
  void ensureLang(l).then(() => { lang.value = l; }).catch(() => undefined);
}

export const lang = signal<Lang>(initialLang());
// the page language follows the language signal on EVERY path (owner's choice, a worker's own language on her phone, back to the owner's): the Hindi font rule is `:lang(hi)`, so without this a worker screen in Hindi never used the bundled font
effect(() => { const l = lang.value; try { document.documentElement.lang = l; } catch { /* no document (unit tests) */ } });

export function setLang(l: Lang) {
  try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  void ensureLang(l).then(() => { lang.value = l; document.documentElement.lang = l; }).catch(() => undefined);      // a chunk that cannot be loaded (offline and not cached yet) leaves the language as it is: no error
}

/** Every translation key, typed from the Greek file: a typo or a missing key is a compile error. */
export type I18nKey = keyof typeof el | keyof typeof uiEl;

const lookup = (key: string) => dictionaries[lang.value][key] ?? dictionaries.el[key] ?? key;

export function t(key: I18nKey, params?: Params, locale?: Lang): string {
  return fill(locale === undefined ? lookup(key) : dictionaries[locale][key] ?? dictionaries.el[key] ?? key, params);
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

/** «20 Νοε 2026, 10:00» in Europe/Athens: the year stays on a record that is kept for years (the printed register). */
export function formatDateTimeYear(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? t('value.unknown') : new Intl.DateTimeFormat(LOCALES[lang.value], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(d);
}

/** «2026-11-20 10:00» in Europe/Athens (for records and exports: unambiguous in every language). */
export function formatLocalIso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}
