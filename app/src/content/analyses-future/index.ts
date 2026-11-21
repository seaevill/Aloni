import el from './el.json';
import en from './en.json';
import hi from './hi.json';
import tr from './tr.json';

interface AnalysisEntry {
  readonly what: string;
  readonly changes: string;
  readonly effect: string;
}
const copy = { el, en, hi, tr } satisfies Record<string, Record<keyof typeof el, AnalysisEntry>>;
export type FutureAnalysisLocale = keyof typeof copy;

export function futureAnalysis(field: string, locale: FutureAnalysisLocale): AnalysisEntry | undefined {
  const dictionary: Readonly<Record<string, AnalysisEntry>> = copy[locale];
  return Object.hasOwn(dictionary, field) ? dictionary[field] : undefined;
}
