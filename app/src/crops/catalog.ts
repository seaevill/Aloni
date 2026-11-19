import type { Row } from '../db/schema';
import { uuidv5 } from '../db/uuid';

/**
 * The crops Bora grows (slugs shared with Κλούβες). Names only: no crate weights, no doses, nothing agronomic.
 * A crop row is created in the real farm the first time it is planted (so the Crops tab only lists what is in use).
 */
export const CATALOG = [
  { slug: 'spinach', el: 'Σπανάκι', tr: 'Ispanak', en: 'Spinach', latin: 'Spinacia oleracea' },
  { slug: 'rocket', el: 'Ρόκα', tr: 'Roka', en: 'Rocket', latin: 'Eruca vesicaria subsp. sativa' },
  { slug: 'parsley', el: 'Μαϊντανός', tr: 'Maydanoz', en: 'Parsley', latin: 'Petroselinum crispum' },
  { slug: 'dill', el: 'Άνηθος', tr: 'Dereotu', en: 'Dill', latin: 'Anethum graveolens' },
  { slug: 'coriander', el: 'Κόλιανδρο', tr: 'Kişniş', en: 'Coriander', latin: 'Coriandrum sativum' },
  { slug: 'chicory', el: 'Ραδίκια άγρια', tr: 'Yabani hindiba (radika)', en: 'Wild chicory', latin: 'Cichorium intybus' },
  { slug: 'endive', el: 'Αντίδια', tr: 'Endivyen', en: 'Endive', latin: 'Cichorium endivia' },
  { slug: 'chard', el: 'Σέσκουλα', tr: 'Pazı', en: 'Swiss chard', latin: 'Beta vulgaris subsp. vulgaris (Cicla group)' },
  { slug: 'onion', el: 'Κρεμμύδι (φρέσκο)', tr: 'Taze soğan', en: 'Spring onion', latin: 'Allium cepa' },
  { slug: 'leek', el: 'Πράσο', tr: 'Pırasa', en: 'Leek', latin: 'Allium ampeloprasum var. porrum' },
] as const;
export type CatalogCrop = (typeof CATALOG)[number];
/** The crop's name in a language; a language without crop names of its own (Hindi) shows the Greek one. */
export const cropName = (c: CatalogCrop, l: 'el' | 'tr' | 'en' | 'hi'): string => c[l === 'hi' ? 'el' : l];

/** The crop row of the real farm for a slug (same id every time on this farm, so planting twice never makes two crops). */
export async function cropRow(c: CatalogCrop, farmId: string, nowIso: string): Promise<Row> {
  return {
    id: await uuidv5(`crop:${c.slug}`, farmId), farm_id: farmId, slug: c.slug,
    name_el: c.el, name_tr: c.tr, name_en: c.en, latin: c.latin, created_at: nowIso, updated_at: nowIso, deleted_at: null,
  };
}
