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

/** There is no server yet (M1): nothing is sent anywhere. Screens then say «saved on this phone» instead of counting records as «unsynced». Becomes true with the live sync PR. */
/** The e2e build (`vite build --mode e2e`) switches the live features ON against a MOCK backend; every other build (production, preview, dev) has them OFF until a PR changes LIVE. */
const E2E = (import.meta as { env?: { MODE?: string } }).env?.MODE === 'e2e'; // (vite.config.ts also imports this file, in Node, where there is no import.meta.env)
const ENV = (import.meta as { env?: Record<string, string | undefined> }).env;
/** The live features are OFF unless the BUILD says so: Cloudflare build variable VITE_LIVE=true (set by Bora, RUNBOOK 12b). No variable = everything closed, exactly as tested in CI. Removing the variable and redeploying is the way back. */
const LIVE = ENV?.VITE_LIVE === 'true' && !!ENV?.VITE_SUPABASE_URL && !!ENV?.VITE_SUPABASE_PUBLISHABLE_KEY;   // a half-filled set of variables stays closed
export const SYNC_CONNECTED = LIVE || E2E;

/** Sign-in and worker invitations (src/auth, SignIn, Workers). OFF: nothing is shown and no request is made. Turned on by Bora after the 0001–0018 migrations and the real-account trial (RUNBOOK 12). */
export const AUTH_ENABLED = LIVE || E2E;
/** The Supabase project's PUBLIC address and publishable key (both are meant to be public; never a secret key). Empty until the live switch. */
export const BACKEND = { url: E2E ? 'http://localhost:4174/mock' : (LIVE ? (ENV?.VITE_SUPABASE_URL ?? '') : ''), apiKey: E2E ? 'e2e-publishable-key' : (LIVE ? (ENV?.VITE_SUPABASE_PUBLISHABLE_KEY ?? '') : '') };

/**
 * The base map (owner only, opened on request). OpenFreeMap vector tiles: free, no key. ⚠ Its terms of use could NOT be read from the build environment (the site was unreachable):
 * confirm them (key-less use, attribution text, fair-use limits) before the live switch, and replace this address if they do not fit. No satellite layer and no cadastre layer yet.
 */
export const MAP = { styleUrl: 'https://tiles.openfreemap.org/styles/liberty', center: [23.35, 38.0] as [number, number], zoom: 12 };
