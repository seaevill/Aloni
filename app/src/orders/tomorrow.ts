import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import type { CropSupply } from './available';
import type { KlouvesOrders } from './klouves';

// «Αύριο φεύγουν»: the crates ordered for TOMORROW per crop, against the crates ACTUALLY cut today. Information only; nothing is decided here.
//  * No yield is estimated (there is no figure for it): «cut today» is what the harvest records say, nothing else.
//  * A planting held by a running or unknown waiting period never counts as supply: it is passed through as «held» / «unknown» and the gap does not move (QA P0-2).
//  * The day is the Athens day (the midnight boundary is Europe/Athens, winter and summer time).
const DAY_MS = 86_400_000;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The Athens calendar day (YYYY-MM-DD) of an instant; undefined for a time that cannot be read. */
export function athensDayOf(instant: string): string | undefined {
  const ms = Date.parse(instant);
  if (!Number.isFinite(ms)) return undefined;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
/** The calendar day after a YYYY-MM-DD (the calendar, not 24 hours of the clock). */
export const nextDay = (date: string): string => new Date(Date.parse(`${date}T12:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

export interface BoardRow { slug: string; ordered: number; cut: number; gap: number; state: 'missing' | 'covered' | 'surplus'; free: number; held: number; unknown: number }
export interface TomorrowBoard { date: string; rows: BoardRow[]; /** products ordered tomorrow that are not linked to a crop: counted, never dropped */ unmapped: number }

const sumOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, Number('0'));
const partsOf = (rec: Readonly<Record<string, number>>, slug: string): number[] => Object.entries(rec).filter(([k]) => k === slug).map(([, v]) => v);
const NO_SUPPLY = { free: Number('0'), held: Number('0'), unknown: Number('0') };

/** Crates cut on the given Athens day, per crop slug (whole crates only; anything else is not guessed). */
export function cutTodayBySlug(today: string, harvests: readonly Row[], plantings: readonly Row[], crops: readonly Row[]): Record<string, number> {
  const slugOfCrop = new Map(crops.map((c) => [text(c.id), text(c.slug)]));
  const slugOfPlanting = new Map(plantings.filter((p) => !p.deleted_at).map((p) => [text(p.id), slugOfCrop.get(text(p.crop_id))]));
  const parts = new Map<string, number[]>();
  for (const h of harvests) {
    const slug = slugOfPlanting.get(text(h.planting_id));
    const n = parseWhole<'Crates'>(text(h.crates_str));
    if (slug && n.known && athensDayOf(text(h.harvested_at)) === today) parts.set(slug, [...(parts.get(slug) ?? []), n.value]);
  }
  return Object.fromEntries([...parts].map(([slug, xs]) => [slug, sumOf(xs)]));
}

export function tomorrowBoard(orders: KlouvesOrders | undefined, map: Readonly<Record<string, string>>, supply: Readonly<Record<string, CropSupply>>, cutToday: Readonly<Record<string, number>>, date: string): TomorrowBoard {
  const orderedParts = new Map<string, number[]>();
  const unmappedIds = new Set<string>();
  for (const items of Object.values(orders?.days?.[date] ?? {})) {
    for (const [productId, qty] of Object.entries(items)) {
      if (!(qty > sumOf([]))) continue;
      const slug = map[productId];
      if (slug === undefined) { unmappedIds.add(productId); continue; }
      orderedParts.set(slug, [...(orderedParts.get(slug) ?? []), qty]);
    }
  }
  const hasOrders = orderedParts.size > sumOf([]) || unmappedIds.size > sumOf([]);
  const slugs = [...new Set([...orderedParts.keys(), ...Object.keys(cutToday)])].sort();
  const rows = slugs.map((slug): BoardRow => {
    const o = sumOf(orderedParts.get(slug) ?? []); const c = sumOf(partsOf(cutToday, slug)); const s = supply[slug] ?? NO_SUPPLY;
    const gap = o - c;
    return { slug, ordered: o, cut: c, gap, state: gap > sumOf([]) ? 'missing' : gap < sumOf([]) ? 'surplus' : 'covered', free: s.free, held: s.held, unknown: s.unknown };
  }).filter((r) => r.ordered > sumOf([]) || r.cut > sumOf([]));
  return { date, rows: hasOrders ? rows : [], unmapped: unmappedIds.size };
}
