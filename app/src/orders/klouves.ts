import { CATALOG } from '../crops/catalog';

// Step 1 of the order link (TECH-SPEC §7, option A): read the BACKUP file of the Κλούβες app (reference/klouves) by hand, once a week. One-way: nothing is written back.
// File shape: { app: 'klouves', at, data: { 'klv.db.cfg': { products: [{id, name}], clients: [...] }, 'klv.db.day.YYYY-MM-DD': { orders: { clientId: { productId: crates } } } } }.
// Crates in Κλούβες go up in quarters; anything else (negative, text, 0.3) is NOT guessed: it is skipped and counted.

export interface KlProduct { id: string; name: string }
export interface KlouvesOrders {
  products: KlProduct[];
  /** Monday (YYYY-MM-DD) of the week → product id → crates ordered that week (all clients, all days). */
  weeks: Record<string, Record<string, number>>;
  skipped: number;
  /** Per day → client id → product id → crates (kept as read; quarters only). Absent in an import made before the dispatch list existed. */
  days?: Record<string, Record<string, Record<string, number>>>;
  clients?: Array<{ id: string; name: string }>;
}
export type ParseResult = { ok: true; orders: KlouvesOrders } | { ok: false };

const DAY = 86_400_000;
const DAY_KEY = /^klv\.db\.day\.(\d{4}-\d{2}-\d{2})$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The Monday of the week a date falls in (Mon–Sun weeks, as the supply table); undefined for a date that does not exist. */
export function mondayOf(iso: string): string | undefined {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) return undefined;
  const monday = ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY;
  return new Date(monday).toISOString().slice(0, 10);
}

export function parseBackup(text: string): ParseResult {
  let file: unknown;
  try { file = JSON.parse(text); } catch { return { ok: false }; }
  if (!isObj(file) || file.app !== 'klouves' || !isObj(file.data)) return { ok: false };
  const cfg = file.data['klv.db.cfg'];
  const products: KlProduct[] = [];
  if (isObj(cfg) && Array.isArray(cfg.products)) {
    for (const p of cfg.products) if (isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim() !== '') products.push({ id: p.id, name: p.name.trim() });
  }
  const clients: Array<{ id: string; name: string }> = [];
  if (isObj(cfg) && Array.isArray(cfg.clients)) {
    for (const c of cfg.clients) if (isObj(c) && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim() !== '') clients.push({ id: c.id, name: c.name.trim() });
  }
  const weeks: Record<string, Record<string, number>> = {};
  const days: Record<string, Record<string, Record<string, number>>> = {};
  let skipped = 0;
  for (const [key, day] of Object.entries(file.data)) {
    const m = DAY_KEY.exec(key);
    const monday = m?.[1] === undefined ? undefined : mondayOf(m[1]);
    if (monday === undefined || !isObj(day) || !isObj(day.orders)) continue;
    for (const [clientId, client] of Object.entries(day.orders)) {
      if (!isObj(client)) continue;
      for (const [productId, q] of Object.entries(client)) {
        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0 || !Number.isInteger(q * 4)) { skipped += 1; continue; }
        if (q === 0) continue;
        const dayKey = m?.[1] ?? '';
        const byClient = ((days[dayKey] ??= {})[clientId] ??= {});
        byClient[productId] = q;
        const week = (weeks[monday] ??= {});
        const before = week[productId];
        if (before === undefined) week[productId] = q;
        else week[productId] = before + q;
      }
    }
  }
  if (products.length === 0 && Object.keys(weeks).length === 0) return { ok: false };
  return { ok: true, orders: { products, weeks, skipped, days, clients } };
}

const plain = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el').replace(/ς/g, 'σ').trim();

/** A first guess for «this Κλούβες product is that crop»: the same name in Greek, Turkish or English. The owner confirms or changes it; no match = no guess. */
export function suggestCropMap(products: readonly KlProduct[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of products) {
    const c = CATALOG.find((x) => [x.el, x.tr, x.en].some((n) => plain(n) === plain(p.name)));
    if (c) out[p.id] = c.slug;
  }
  return out;
}

/** Crates per crop slug for one week; products without a crop (or mapped to nothing) are not counted and are listed in `unmapped`. */
export function cratesByCrop(week: Record<string, number> | undefined, cropMap: Readonly<Record<string, string>>): { bySlug: Record<string, number>; unmapped: string[] } {
  const bySlug: Record<string, number> = {};
  const unmapped: string[] = [];
  for (const [pid, q] of Object.entries(week ?? {})) {
    const slug = cropMap[pid];
    if (!slug) { unmapped.push(pid); continue; }
    const before = bySlug[slug];
    if (before === undefined) bySlug[slug] = q;
    else bySlug[slug] = before + q;
  }
  return { bySlug, unmapped };
}
