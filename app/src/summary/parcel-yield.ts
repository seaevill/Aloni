import { addDecimal, parseDecimal, parseWhole, type Decimal } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import type { Work } from '../fieldwork/fieldwork';

// «Παραγωγικότητα χωραφιού»: the crates written in the harvest records of this parcel ÷ the parcel's own area (crates per στρέμμα). Counted in CRATES only: a crate is never turned into kilograms
// (no weight is recorded). Deleted harvests are not counted; a harvest whose crate number cannot be read makes the result UNKNOWN (it is never skipped quietly and never read as zero).
// The plantings counted are the parcel's live ones, the same set the parcel timeline uses. Information only: it decides and advises nothing.
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const split = (d: string): { n: bigint; scale: number } => { const [i, f] = d.split('.'); const frac = f ?? ''; return { n: BigInt(`${i ?? ''}${frac}`), scale: frac.length }; };
/** a ÷ b as decimal TEXT with 6 decimals, cut (never rounded), by whole-number arithmetic: 4.8 ÷ 0.8 is exactly «6», never 5.999999. */
const SCALE = 1_000_000n;
export function ratio(a: string, b: string): string {
  const x = split(a); const y = split(b);
  const q = (x.n * 10n ** BigInt(y.scale) * SCALE) / (y.n * 10n ** BigInt(x.scale));
  const whole = q / SCALE; const rest = q - whole * SCALE; const frac = rest.toString().padStart(6, '0').replace(/0+$/, '');
  return frac === '' ? String(whole) : `${String(whole)}.${frac}`;
}

export interface YieldSource { id: string; at: string; crates: string; plantingId: string; /** the planting was archived later: the harvest still happened and still counts */ archived: boolean }
export interface CropYield { cropId: string; crates: number; perStrema: string }
// SCOPE (stated on the screen, never implied otherwise): CUMULATIVE = every non-deleted harvest ever recorded on this parcel, all crops, all seasons, archived plantings included
// (archiving a planting hides it from the lists; it does not undo a harvest that happened). `byCrop` = the same records split by crop, each ÷ the PARCEL's area (not the planting's area).
// There is no season in the data model, so no season-specific yield exists here. Deleted harvest rows are never counted.
export type ParcelYield =
  | { known: true; crates: number; area: string; perStrema: string; sources: YieldSource[]; byCrop: CropYield[]; archivedCrates: number }
  | { known: false; reason: 'no-area' | 'no-records' | 'unreadable'; sources: YieldSource[]; unreadable: number };

export function parcelYield(parcel: Row, plantings: readonly Row[], harvests: readonly Row[]): ParcelYield {
  const own = plantings.filter((p) => p.parcel_id === parcel.id);
  const ids = new Set(own.map((p) => text(p.id)));
  const mine = harvests.filter((h) => !h.deleted_at && ids.has(text(h.planting_id)));
  const sources: YieldSource[] = []; let crates = 0; let archivedCrates = 0; let unreadable = 0;
  const perCrop = new Map<string, number[]>();
  for (const h of mine) {
    const n = parseWhole<'Crates'>(text(h.crates_str));
    if (!n.known) { unreadable += 1; continue; }
    const planting = own.find((p) => p.id === h.planting_id);
    const archived = Boolean(planting?.deleted_at);
    crates += n.value;
    if (archived) archivedCrates += n.value;
    const crop = text(planting?.crop_id);
    perCrop.set(crop, [...(perCrop.get(crop) ?? []), n.value]);
    sources.push({ id: text(h.id), at: text(h.harvested_at), crates: text(h.crates_str).trim(), plantingId: text(h.planting_id), archived });
  }
  sources.sort((a, b) => b.at.localeCompare(a.at));
  if (mine.length === 0) return { known: false, reason: 'no-records', sources, unreadable };
  if (unreadable > 0) return { known: false, reason: 'unreadable', sources, unreadable };
  const area = parseDecimal(text(parcel.area_str));
  if (!area.known || !(parseFloat(area.value) > 0)) return { known: false, reason: 'no-area', sources, unreadable };
  const byCrop = [...perCrop].map(([cropId, parts]): CropYield => { const c = parts.reduce((a, b) => a + b, Number('0')); return { cropId, crates: c, perStrema: ratio(String(c), area.value) }; });
  return { known: true, crates, area: area.value, perStrema: ratio(String(crates), area.value), sources, byCrop, archivedCrates };
}

// «Νερό που καταγράφηκε»: the m³ the owner wrote in his irrigation records of this parcel, and m³ per στρέμμα. If one irrigation record has only minutes (no m³) the total is NOT shown as complete:
// the per-στρέμμα number is unknown and the screen says how many records are missing their m³. Nothing here advises how much to irrigate.
export type ParcelWater =
  | { known: true; records: number; m3: string; perStrema: string }
  | { known: false; reason: 'no-records' | 'no-area' | 'missing-m3'; records: number; missing: number };

export function parcelWater(parcel: Row, work: readonly Work[]): ParcelWater {
  const mine = work.filter((w) => w.kind === 'irrigate' && w.parcel_id === parcel.id);
  if (mine.length === 0) return { known: false, reason: 'no-records', records: 0, missing: 0 };
  let sum = '0' as Decimal; let missing = 0;
  for (const w of mine) {
    const m3 = parseDecimal(w.m3 ?? '');
    if (!m3.known) { missing += 1; continue; }
    sum = addDecimal(sum, m3.value);
  }
  if (missing > 0) return { known: false, reason: 'missing-m3', records: mine.length, missing };
  const area = parseDecimal(text(parcel.area_str));
  if (!area.known || !(parseFloat(area.value) > 0)) return { known: false, reason: 'no-area', records: mine.length, missing: 0 };
  return { known: true, records: mine.length, m3: sum, perStrema: ratio(sum, area.value) };
}
