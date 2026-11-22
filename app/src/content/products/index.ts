import el from './el.json';
import en from './en.json';
import hi from './hi.json';
import tr from './tr.json';

const library: Readonly<Record<'el' | 'en' | 'hi' | 'tr', Readonly<Record<string, readonly string[]>>>> = { el, en, hi, tr };

/** Match only the recorded substance and its recorded class. Product labels are separate. */
export function productKnowledge(active: unknown, type: unknown, language: string): string | undefined {
  if (typeof active !== 'string' || (language !== 'el' && language !== 'en' && language !== 'hi' && language !== 'tr')) return undefined;
  const key = active.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const entry = library[language][key];
  return entry?.[0] === type ? entry?.[1] : undefined;
}
