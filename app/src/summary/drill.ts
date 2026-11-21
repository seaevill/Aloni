import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { dayOf } from './today';

// The numbers on Σήμερα open sheets that ADD UP to them (docs/plan/bora-feedback-2026-11-21.md §1). Only LOGGED harvests count; a count nobody can read is listed apart, never added and never 0.
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The exact sum of the READABLE numbers; undefined when there is none (never 0). */
const sumOf = (v: ReadonlyArray<number | undefined>): number | undefined => {
  const known = v.filter((x): x is number => x !== undefined);
  return known.length === 0 ? undefined : known.reduce((a, b) => a + b);
};

export interface HarvestLine { id: string; at: string; crop: string | undefined; parcel: string | undefined; crates: number | undefined }
export interface HarvestTable { rows: HarvestLine[]; unreadable: HarvestLine[]; total: number | undefined }

/** The logged harvests of the last `days` days up to `nowIso`, newest first, and their exact sum (undefined when no count is readable). */
export function harvestTable(harvests: readonly Row[], plantings: readonly Row[], parcels: readonly Row[], crops: readonly Row[], nowIso: string, days: number): HarvestTable {
  const today = dayOf(nowIso); const first = dayOf(new Date(Date.parse(`${today}T12:00:00Z`) - (days - 1) * 86_400_000).toISOString());     // the SAME window as the tile and the sparkline (today.ts cratesPerDay): the last `days` Athens calendar days, today included
  const rows: HarvestLine[] = []; const unreadable: HarvestLine[] = [];
  for (const h of harvests) {
    const at = text(h.harvested_at);
    const day = dayOf(at);
    if (day === '' || day < first || day > today) continue;
    const planting = plantings.find((p) => p.id === h.planting_id);
    const n = parseWhole<'Crates'>(text(h.crates_str));
    const line: HarvestLine = {
      id: text(h.id), at,
      crop: text(crops.find((c) => c.id === planting?.crop_id)?.slug) || undefined,
      parcel: text(parcels.find((p) => p.id === planting?.parcel_id)?.name) || undefined,
      crates: n.known ? n.value : undefined,
    };
    (n.known ? rows : unreadable).push(line);
  }
  rows.sort((a, b) => b.at.localeCompare(a.at)); unreadable.sort((a, b) => b.at.localeCompare(a.at));
  return { rows, unreadable, total: sumOf(rows.map((r) => r.crates)) };
}

export interface CropSummary { plantings: Array<{ id: string; parcel: string; area: string }>; today: number | undefined; logged: number | undefined }
/** One crop: its live plantings (parcel and the area exactly as typed), the crates logged today (Athens day) and all logged. Nothing logged = undefined (the sheet says «δεν έχει καταγραφεί»). */
export function cropSummary(cropId: string, plantings: readonly Row[], parcels: readonly Row[], harvests: readonly Row[], nowIso: string): CropSummary {
  const mine = plantings.filter((p) => p.crop_id === cropId && !p.deleted_at);
  const ids = new Set(mine.map((p) => String(p.id)));
  const today = dayOf(nowIso);
  const logged: number[] = []; const todays: number[] = [];
  for (const h of harvests) {
    if (!ids.has(text(h.planting_id))) continue;
    const n = parseWhole<'Crates'>(text(h.crates_str));
    if (!n.known) continue;
    logged.push(n.value);
    if (dayOf(h.harvested_at) === today) todays.push(n.value);
  }
  return { plantings: mine.map((p) => ({ id: String(p.id), parcel: text(parcels.find((x) => x.id === p.parcel_id)?.name), area: text(p.area_str) })), today: sumOf(todays), logged: sumOf(logged) };
}
