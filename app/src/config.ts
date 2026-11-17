// The product name lives in this file only (decision 2026-11-17, PROVISIONAL until the name,
// trademark and domain checks are done – see docs/DECISIONS.md and docs/naming/round2/verification.md).
// Do NOT use "Aloni Farm": an Israeli app is called that (משק אלוני).
export const APP_NAME = 'Aloni';
export const APP_NAME_EL = 'Αλώνι';

// English/Greek descriptors appear ONLY in store titles (≤30 chars), never in the app UI or brand.
export const STORE_TITLE_EN = 'Aloni: Spray Log & Crop Plan';
export const STORE_TITLE_EL = 'Αλώνι: Βιβλίο Ψεκασμών & Σπορά';

export const TZ = 'Europe/Athens';
// Demo rows get UUIDv5 ids from this namespace + their prototype id (stable across re-imports; same ids a server can compute).
export const DEMO_NAMESPACE = 'b4f5c3a2-1d6e-4f8a-9c7b-2e5d8a1f3c60';
export const DEMO_FARM_ID = '2843e10d-bdc6-5886-a109-84501d373de2'; // uuidv5('farm:demo', DEMO_NAMESPACE), checked by a test
