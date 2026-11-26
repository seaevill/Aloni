// DEMO SEASON photos (queue item 33): ten open-licence photos from Wikimedia Commons (CC BY / CC BY-SA only; no NC, no ND; no recognisable people), resized to 640 px.
// They live in /public/demo-photos and are fetched ONLY when the Demo season is loaded: not part of the first-load JavaScript, not precached by the service worker (jpg is not in its glob).
// Every photo carries its source line (author · licence · link) on screen; the full list is docs/content/photo-credits.md.
export interface DemoPhoto { file: string; subject: string; caption: string; title: string; author: string; license: string; licenseUrl: string; page: string }
export const DEMO_PHOTOS: readonly DemoPhoto[] = [
  {
    "file": "01-spinach.jpg",
    "subject": "spinach",
    "caption": "Σπανάκι: χωράφι",
    "title": "Spinach field in Italy 1.jpg",
    "author": "Peter Forster",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Spinach_field_in_Italy_1.jpg"
  },
  {
    "file": "02-lettuce.jpg",
    "subject": "lettuce",
    "caption": "Μαρούλι: χωράφι με λευκό φιλμ",
    "title": "Leaf-Lettuce-field.jpg",
    "author": "MaedaAkihiko",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Leaf-Lettuce-field.jpg"
  },
  {
    "file": "03-lettuce.jpg",
    "subject": "lettuce",
    "caption": "Μαρούλι: χωράφι",
    "title": "Fields of lettuce, Lower Tenthill, 2022.jpg",
    "author": "Kerry Raymond",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Fields_of_lettuce,_Lower_Tenthill,_2022.jpg"
  },
  {
    "file": "04-rocket.jpg",
    "subject": "rocket",
    "caption": "Ρόκα: άνθη",
    "title": "Eruca sativa II.jpg",
    "author": "Juan Carlos Fonseca Mata",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Eruca_sativa_II.jpg"
  },
  {
    "file": "05-dill.jpg",
    "subject": "dill",
    "caption": "Άνηθος",
    "title": "Dill Plant.jpg",
    "author": "Filipinotayo",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Dill_Plant.jpg"
  },
  {
    "file": "06-dill.jpg",
    "subject": "dill",
    "caption": "Άνηθος στον κήπο",
    "title": "Lots of Dill (2646187516).jpg",
    "author": "daryl_mitchell from Saskatoon, Saskatchewan, Canada",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Lots_of_Dill_(2646187516).jpg"
  },
  {
    "file": "07-coriander.jpg",
    "subject": "coriander",
    "caption": "Κόλιανδρος: άνθη",
    "title": "Coriandrum sativum kz05.jpg",
    "author": "Krzysztof Ziarnek, Kenraiz",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Coriandrum_sativum_kz05.jpg"
  },
  {
    "file": "08-radicchio.jpg",
    "subject": "radicchio",
    "caption": "Ραδίκι",
    "title": "Radicchio (5680915288).jpg",
    "author": "cyclonebill from Copenhagen, Denmark",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Radicchio_(5680915288).jpg"
  },
  {
    "file": "09-leek.jpg",
    "subject": "leek",
    "caption": "Πράσο: χωράφι",
    "title": "Leek field in Italy 2.jpg",
    "author": "Peter Forster",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Leek_field_in_Italy_2.jpg"
  },
  {
    "file": "10-irrigation.jpg",
    "subject": "irrigation",
    "caption": "Στάγδην άρδευση στο χωράφι",
    "title": "Drip irrigation work in a farm 1.jpg",
    "author": "abhiriksh",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "page": "https://commons.wikimedia.org/wiki/File:Drip_irrigation_work_in_a_farm_1.jpg"
  }
];
/** The short source line shown under a photo. */
export const sourceLine = (p: DemoPhoto): string => `${p.author} · ${p.license} · Wikimedia Commons`;
