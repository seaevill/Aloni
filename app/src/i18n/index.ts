import { signal } from '@preact/signals';
import el from './el.json';
import tr from './tr.json';
import en from './en.json';
import { TZ } from '../config';

export type Lang = 'el' | 'tr' | 'en';
export const LANGS: Lang[] = ['el', 'tr', 'en'];
export const dictionaries: Record<Lang, Record<string, string>> = { el, tr, en };
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

export function t(key: string, params?: Record<string, string | number>): string {
  let s = dictionaries[lang.value][key] ?? dictionaries.el[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** 0.6 -> "0,6 στρ." (Greek number format) */
export function formatArea(str: number): string {
  const n = new Intl.NumberFormat(LOCALES[lang.value], { maximumFractionDigits: 2 }).format(str);
  return `${n} ${lang.value === 'el' ? 'στρ.' : lang.value === 'tr' ? 'dönüm' : 'str.'}`;
}

/** ISO date -> "Δευ 16 Νοε" in Europe/Athens */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[lang.value], { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
    .format(new Date(`${iso}T12:00:00Z`));
}
