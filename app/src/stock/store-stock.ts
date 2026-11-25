import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { isDispatch } from './destination-words';

// «Συγκομιδή στην αποθήκη»: the crates cut, by where the record says they went (store / direct dispatch). A harvest without a destination is OLD or unknown: it is counted apart and never added to the store.
// Whole crates only (as logged); an unreadable crate number is counted apart, never as 0. Nothing is estimated and nothing is decided here.
export interface StoreLine { slug: string; store: number; /** crates loaded onto a vehicle («Φορτώθηκε»), taken off the store */ out: number; /** store − out; negative = more loaded than the store records show (kept as it is) */ left: number; dispatch: number; unknown: number; unreadable: number; oldestStoreDay: string | undefined; ageDays: number | undefined }
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const DAY_MS = 86_400_000;
const dayOf = (iso: string): string => { const ms = Date.parse(iso); return Number.isFinite(ms) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)) : ''; };

function ageOf(day: string | undefined, today: string): number | undefined {
  if (day === undefined) return undefined;
  return (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / DAY_MS;
}

/** `dest` is the phone's own answers (harvest id → where it went) for records whose row carries no `destination` yet; the row's own field wins. */
export function storeStock(today: string, harvests: readonly Row[], plantings: readonly Row[], crops: readonly Row[], dest: Readonly<Record<string, { d: string }>> = {}, outBySlug: Readonly<Record<string, number>> = {}): StoreLine[] {
  const slugOfCrop = new Map(crops.map((c) => [text(c.id), text(c.slug)]));
  const slugOfPlanting = new Map(plantings.map((p) => [text(p.id), slugOfCrop.get(text(p.crop_id)) ?? '']));
  const by = new Map<string, StoreLine>();
  for (const h of harvests) {
    const day = dayOf(text(h.harvested_at)); const slug = slugOfPlanting.get(text(h.planting_id)) ?? '';
    if (h.deleted_at || slug === '' || day === '' || day > today) continue;
    let line = by.get(slug);
    if (line === undefined) line = { slug, store: Number('0'), out: Number('0'), left: Number('0'), dispatch: Number('0'), unknown: Number('0'), unreadable: Number('0'), oldestStoreDay: undefined, ageDays: undefined };
    const n = parseWhole<'Crates'>(text(h.crates_str));
    const where = h.destination === 'store' ? 'store' : isDispatch(h.destination) ? 'dispatch' : dest[text(h.id)]?.d;
    if (!n.known) line.unreadable += 1;
    else if (where === 'store') { line.store += n.value; if (line.oldestStoreDay === undefined || day < line.oldestStoreDay) line.oldestStoreDay = day; }
    else if (where === 'dispatch') line.dispatch += n.value;
    else line.unknown += n.value;
    by.set(slug, line);
  }
  for (const [slug, n] of Object.entries(outBySlug)) { const line = by.get(slug); if (line) line.out += n; }          // nothing loaded for a crop = the zero it started with
  const out = [...by.values()].map((l) => ({ ...l, ageDays: ageOf(l.oldestStoreDay, today) }));
  const lines = out.map((l) => ({ ...l, left: l.store - l.out }));
  const key = (l: StoreLine): string => (l.oldestStoreDay === undefined ? `9999 ${l.slug}` : `${l.oldestStoreDay} ${l.slug}`);      // oldest store day first, then by name
  return lines.sort((a, b) => key(a).localeCompare(key(b)));
}
