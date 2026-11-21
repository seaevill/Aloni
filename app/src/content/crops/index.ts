import el from './el.json';
import en from './en.json';
import tr from './tr.json';
import type { CATALOG } from '../../crops/catalog';

export type CropSlug = (typeof CATALOG)[number]['slug'];
export interface CropContent {
  readonly history: string;
  readonly facts: readonly string[];
  readonly tips: string;
  readonly strength: string;
  readonly weakness: string;
  readonly problems: readonly string[];
}
const entries = { el, en, tr } satisfies Record<string, Record<CropSlug, CropContent>>;
export type CropLocale = keyof typeof entries;

export function cropContent(slug: string, locale: CropLocale): CropContent | undefined {
  const dictionary: Readonly<Record<string, CropContent>> = entries[locale];
  return Object.hasOwn(dictionary, slug) ? dictionary[slug] : undefined;
}
