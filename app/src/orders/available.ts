import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { harvestGate } from '../spray/harvest';

// «Διαθέσιμες κλούβες»: per crop, what can be CUT now and what is held. Only plantings whose waiting periods are over count as supply; one with a running or unknown
// waiting period is listed as held and NEVER counted (QA P0-2). No yield is estimated: there is no figure for it, so the crates actually cut (last 7 days) are shown instead.

export interface CropSupply { slug: string; free: number; held: number; unknown: number; cut7: number }
export type SowHint = 'ready' | 'held' | 'none';
const DAY = 86_400_000;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const GROWING = new Set(['growing', 'harvesting']);

export function supplyByCrop(nowIso: string, crops: readonly Row[], plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[], harvests: readonly Row[], labels: readonly Row[]): Record<string, CropSupply> {
  const slugOf = new Map(crops.map((c) => [text(c.id), text(c.slug)]));
  const whole = nowIso.replace(/\.\d+Z$/, 'Z');
  const since = new Date(Date.parse(nowIso) - 7 * DAY).toISOString();
  const out: Record<string, CropSupply> = {};
  const of = (slug: string): CropSupply => (out[slug] ??= { slug, free: 0, held: 0, unknown: 0, cut7: 0 });
  const slugOfPlanting = new Map<string, string>();
  for (const p of plantings) {
    const slug = slugOf.get(text(p.crop_id));
    if (!slug || p.deleted_at) continue;
    slugOfPlanting.set(text(p.id), slug);
    if (!GROWING.has(text(p.status))) continue;
    const g = harvestGate(text(p.id), whole, links, sprayRows, plantings, labels);
    const c = of(slug);
    if (g.ok) c.free += 1; else if (g.reason === 'unknown') c.unknown += 1; else c.held += 1;   // a bad clock time also blocks: counted as held
  }
  for (const h of harvests) {
    const slug = slugOfPlanting.get(text(h.planting_id));
    const n = parseWhole<'Crates'>(text(h.crates_str));
    if (slug && n.known && text(h.harvested_at) >= since) of(slug).cut7 += n.value;
  }
  return out;
}

/** Information for the sowing screen (rule SOW is unsigned, so this only SHOWS): ordered, but nothing can be cut and nothing is growing → «none»; growing but held → «held». */
export function sowHint(s: CropSupply | undefined): SowHint {
  if (s && s.free > 0) return 'ready';
  return s && s.held + s.unknown > 0 ? 'held' : 'none';
}
