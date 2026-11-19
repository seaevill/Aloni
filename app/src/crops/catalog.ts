import type { Row } from '../db/schema';
import { uuidv5 } from '../db/uuid';

/**
 * The crops Bora grows (slugs shared with Κλούβες; his 17 crops of 2026-11-19 are all here). Names only: no crate weights, no doses, nothing agronomic.
 * A crop row is created in the real farm the first time it is planted (so the Crops tab only lists what is in use).
 */
export const CATALOG = [
  { slug: 'spinach', el: 'Σπανάκι', tr: 'Ispanak', en: 'Spinach', latin: 'Spinacia oleracea' },
  { slug: 'rocket', el: 'Ρόκα', tr: 'Roka', en: 'Rocket', latin: 'Eruca vesicaria subsp. sativa' },
  { slug: 'parsley', el: 'Μαϊντανός', tr: 'Maydanoz', en: 'Parsley', latin: 'Petroselinum crispum' },
  { slug: 'dill', el: 'Άνηθος', tr: 'Dereotu', en: 'Dill', latin: 'Anethum graveolens' },
  { slug: 'coriander', el: 'Κόλιανδρο', tr: 'Kişniş', en: 'Coriander', latin: 'Coriandrum sativum' },
  { slug: 'chicory', el: 'Ραδίκια άγρια', tr: 'Yabani hindiba (radika)', en: 'Wild chicory', latin: 'Cichorium intybus' },
  { slug: 'endive', el: 'Αντίδια', tr: 'Endivyen (kıvırcık hindiba)', en: 'Endive', latin: 'Cichorium endivia' },
  { slug: 'chard', el: 'Σέσκουλα', tr: 'Pazı', en: 'Swiss chard', latin: 'Beta vulgaris subsp. vulgaris (Cicla group)' },
  { slug: 'onion', el: 'Κρεμμύδι (φρέσκο)', tr: 'Taze soğan', en: 'Spring onion', latin: 'Allium cepa' },
  { slug: 'leek', el: 'Πράσο', tr: 'Pırasa', en: 'Leek', latin: 'Allium ampeloprasum var. porrum' },
  // Bora's list of 2026-11-19 (Greek + Turkish names as he wrote them). English names are plain/transliterated; the Latin name is left EMPTY where I am not sure (never guessed). Not agronomic data.
  { slug: 'vlita', el: 'Βλήτα', tr: 'Horoz ibiği yaprağı (vlita)', en: 'Vlita (amaranth greens)', latin: 'Amaranthus' },
  { slug: 'kaukalithra', el: 'Καυκαλήθρα', tr: 'Kafkalitra (yabani maydanozgil)', en: 'Kaukalithra (wild umbellifer green)', latin: '' },
  { slug: 'cabbage', el: 'Λάχανα', tr: 'Lahana (yaprak)', en: 'Cabbage (leaves)', latin: 'Brassica oleracea' },
  { slug: 'myroni', el: 'Μυρώνι', tr: 'Mironi (yabani rezene benzeri ot)', en: 'Myroni (wild herb)', latin: '' },
  { slug: 'beet', el: 'Παντζάρια', tr: 'Pancar', en: 'Beetroot', latin: 'Beta vulgaris' },
  { slug: 'radish', el: 'Ραπάνι', tr: 'Turp', en: 'Radish', latin: 'Raphanus sativus' },
  { slug: 'celery', el: 'Σέλινο', tr: 'Kereviz (yaprak)', en: 'Celery (leaves)', latin: 'Apium graveolens' },
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
