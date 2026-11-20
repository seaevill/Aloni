import type { Row } from '../db/schema';

// «Χρονολόγιο» of a parcel: ONE read-only stream of what the records say happened on it (sowing, sprayings, harvests), newest first.
// Information only: it shows the stored values as they are; a waiting-period end that is not stored is simply absent (unknown), never worked out here, and nothing is decided.
export const TIMELINE_MAX = 20;
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

export type TimelineEvent =
  | { kind: 'sown'; id: string; at: string; crop: string }
  | { kind: 'spray'; id: string; at: string; product: string; phiUntil?: string; reiUntil?: string }
  | { kind: 'harvest'; id: string; at: string; crop: string; crates: string };

/** `sprays` must already be the EFFECTIVE ones (a correction replaces its original: see effectiveSprays). */
export function parcelTimeline(
  parcelId: unknown, plantings: readonly Row[], links: readonly Row[], sprays: readonly Row[], harvests: readonly Row[],
  names: { crop: (id: unknown) => string; product: (id: unknown) => string },
): TimelineEvent[] {
  const mine = plantings.filter((p) => p.parcel_id === parcelId && !p.deleted_at);
  const ids = new Set(mine.map((p) => String(p.id)));
  const jobs = new Set(links.filter((l) => ids.has(String(l.planting_id))).map((l) => String(l.job_id)));
  const cropOf = (plantingId: unknown): string => names.crop(mine.find((p) => p.id === plantingId)?.crop_id);
  const events: TimelineEvent[] = [
    ...mine.filter((p) => text(p.sown_on) !== '').map((p): TimelineEvent => ({ kind: 'sown', id: String(p.id), at: text(p.sown_on), crop: names.crop(p.crop_id) })),
    ...sprays.filter((s) => jobs.has(String(s.job_id)) && text(s.sprayed_at) !== '').map((s): TimelineEvent => ({
      kind: 'spray', id: String(s.id), at: text(s.sprayed_at), product: names.product(s.product_id),
      ...(text(s.phi_until) !== '' ? { phiUntil: text(s.phi_until) } : {}), ...(text(s.rei_until) !== '' ? { reiUntil: text(s.rei_until) } : {}),
    })),
    ...harvests.filter((h) => ids.has(String(h.planting_id)) && text(h.harvested_at) !== '').map((h): TimelineEvent => ({ kind: 'harvest', id: String(h.id), at: text(h.harvested_at), crop: cropOf(h.planting_id), crates: text(h.crates_str) })),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(Number('0'), TIMELINE_MAX);
}
