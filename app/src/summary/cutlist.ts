import type { Row } from '../db/schema';
import { harvestGate, type Source } from '../spray/harvest';

// «Κοπή σήμερα»: one line per growing planting. Free only when the stored label values say so; a missing waiting period is «unknown», never free.
// Information only: nothing here decides or changes a record.
const GROWING = new Set(['growing', 'harvesting']);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface CutLine { id: string; parcelId: string; parcel: string; crop: string; state: 'free' | 'from' | 'unknown'; at: string; source: Source; late: boolean }
export interface CutToday {
  lines: CutLine[];
  /** Parcels with no growing planting: they say «Χωρίς φύτευση» and never count as «χωρίς αναμονή». */
  noPlanting: Row[];
  /** Parcels with at least one growing planting where every planting is free / where at least one is held or unknown. */
  freeParcels: number;
  heldParcels: number;
}

export function cutToday(parcels: readonly Row[], plantings: readonly Row[], links: readonly Row[], sprays: readonly Row[], cropName: (id: unknown) => string, now: string): CutToday {
  const lines: CutLine[] = [];
  const noPlanting: Row[] = [];
  let freeParcels = Number('0'); let heldParcels = Number('0');
  for (const p of parcels.filter((x) => !x.deleted_at)) {
    const mine = plantings.filter((x) => x.parcel_id === p.id && !x.deleted_at);
    const before = lines.length;
    let held = false;
    for (const pl of mine) {
      const g = harvestGate(String(pl.id), now, links, sprays);
      const base = { id: String(pl.id), parcelId: String(p.id), parcel: text(p.name), crop: cropName(pl.crop_id) };
      if (g.ok) { if (GROWING.has(text(pl.status))) lines.push({ ...base, state: 'free', at: '', source: 'label', late: false }); continue; }
      held = true;      // EVERY planting is gated, whatever its status: a sprayed planting that is «planned» or «finished» but not yet cut is never hidden
      if (g.reason === 'running' && g.until) lines.push({ ...base, state: 'from', at: g.until, source: g.source ?? 'label', late: g.late === true });
      else lines.push({ ...base, state: 'unknown', at: '', source: 'label', late: false });
    }
    if (lines.length === before) { noPlanting.push(p); continue; }
    if (held) heldParcels += 1; else freeParcels += 1;
  }
  return { lines, noPlanting, freeParcels, heldParcels };
}
