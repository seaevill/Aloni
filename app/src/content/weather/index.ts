import el from './el.json';
import en from './en.json';
import hi from './hi.json';
import tr from './tr.json';

const copy = { el, en, hi, tr } satisfies Record<string, Record<keyof typeof el, string>>;
export type WeatherLocale = keyof typeof copy;

export function weatherExplanation(field: string, locale: WeatherLocale): string | undefined {
  const dictionary: Readonly<Record<string, string>> = copy[locale];
  return Object.hasOwn(dictionary, field) ? dictionary[field] : undefined;
}
