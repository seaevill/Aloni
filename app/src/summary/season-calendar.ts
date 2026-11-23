import { isCalendarDate } from '@aloni/rules-core';
import type { Row } from '../db/schema';

const athensMonth = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Athens', month: '2-digit' });
const dayPattern = /^(\d{4}-(\d{2})-\d{2})$/;
const instantPattern = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function seasonMonths(farm: string, crop: string, plantings: readonly Row[], harvests: readonly Row[]) {
  const months = new Map(Array.from({ length: 12 }, (_, index) => [String(index + 1).padStart(2, '0'), { sown: 0, harvested: 0 }]));
  const cropPlantings = plantings.filter((row) => row.farm_id === farm && row.crop_id === crop);
  let undated = 0;
  for (const row of cropPlantings) {
    if (row.deleted_at) continue;
    const match = typeof row.sown_on === 'string' ? dayPattern.exec(row.sown_on) : undefined;
    const bucket = match && isCalendarDate(match[1]) ? months.get(match[2]) : undefined;
    if (bucket) bucket.sown += 1;
    else undated += 1;
  }
  const ids = new Set(cropPlantings.map((row) => row.id));
  for (const row of harvests) {
    if (row.farm_id !== farm || row.deleted_at || typeof row.planting_id !== 'string' || !ids.has(row.planting_id)) continue;
    const value = row.harvested_at;
    const day = typeof value === 'string' ? instantPattern.exec(value)?.[1] : undefined;
    const at = typeof value === 'string' && day && isCalendarDate(day) ? new Date(value) : undefined;
    const bucket = at && !Number.isNaN(at.getTime()) ? months.get(athensMonth.format(at)) : undefined;
    if (bucket) bucket.harvested += 1;
    else undated += 1;
  }
  return { months: [...months.values()], undated };
}
