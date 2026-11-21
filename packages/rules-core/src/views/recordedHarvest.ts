import { athensDate } from '../stock';
import { dateAfterDays, isCalendarDate } from '../waits';

export interface HarvestRecord {
  readonly id: string;
  readonly at: string;
  readonly cropId?: string;
  readonly parcelId?: string;
  readonly crates: number | null;
  readonly wait: 'clear' | 'held' | 'unknown';
}

export interface HarvestBucket {
  readonly eligible: number | null;
  readonly records: readonly string[];
  readonly held: readonly string[];
  readonly unknown: readonly string[];
}

const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

export function recordedDay(at: string): string | undefined {
  if (isCalendarDate(at)) return at;
  return instant.test(at) && isCalendarDate(at.slice(0, 10)) && Number.isFinite(Date.parse(at)) ? athensDate(at) : undefined;
}

const monday = (day: string) => dateAfterDays(day, -((new Date(day).getUTCDay() + 6) % 7));

function bucket(rows: readonly HarvestRecord[]): HarvestBucket {
  const eligible: HarvestRecord[] = [];
  const held: string[] = [];
  const unknown: string[] = [];
  let sum = 0;
  for (const row of rows) {
    if (row.wait === 'held') held.push(row.id);
    else if (row.wait !== 'clear' || row.crates === null || !Number.isSafeInteger(row.crates) || row.crates < 0) unknown.push(row.id);
    else { eligible.push(row); sum += row.crates; }
  }
  if (!Number.isSafeInteger(sum)) return { eligible: null, records: [], held, unknown: [...unknown, ...eligible.map((row) => row.id)] };
  return { eligible: eligible.length > 0 ? sum : null, records: eligible.map((row) => row.id), held, unknown };
}

/** Includes the Athens week containing asOf and preceding calendar weeks. */
export function heatData(rows: readonly HarvestRecord[], asOf: string, weeks?: number) {
  const end = recordedDay(asOf);
  if (end === undefined || (weeks !== undefined && (!Number.isSafeInteger(weeks) || weeks < 1 || weeks > 52))) return { weeks: [], parcels: [], unplaced: [] };
  const recent = monday(end);
  if (!recent.known) return { weeks: [], parcels: [], unplaced: [] };
  const offsets = weeks === undefined ? [-77, -70, -63, -56, -49, -42, -35, -28, -21, -14, -7, 0]
    : Array.from({ length: weeks }, (_, i) => -7 * (weeks - i - 1));
  const grid = offsets.map((offset) => dateAfterDays(recent.value, offset))
    .flatMap((day) => day.known ? [day.value] : []);
  const parcels = new Map<string, Map<string, HarvestRecord[]>>();
  const unplaced: string[] = [];
  for (const row of rows) {
    const day = recordedDay(row.at);
    if (!day) { unplaced.push(row.id); continue; }
    if (day > end || (instant.test(asOf) && instant.test(row.at) && Date.parse(row.at) > Date.parse(asOf))) continue;
    const week = monday(day);
    if (!week.known || !grid.includes(week.value)) continue;
    if (!row.parcelId) { unplaced.push(row.id); continue; }
    const cells = parcels.get(row.parcelId) ?? new Map<string, HarvestRecord[]>();
    const members = cells.get(week.value) ?? [];
    members.push(row);
    cells.set(week.value, members);
    parcels.set(row.parcelId, cells);
  }
  return {
    weeks: grid,
    parcels: [...parcels].map(([parcelId, cells]) => ({
      parcelId,
      cells: grid.map((week) => ({ week, ...bucket(cells.get(week) ?? []) })),
    })),
    unplaced,
  };
}

export function monthRingData(plantings: readonly { readonly sownOn?: string }[]) {
  const keys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const months = new Set<number>();
  for (const { sownOn } of plantings) {
    if (sownOn === undefined || !isCalendarDate(sownOn)) continue;
    months.add(keys.indexOf(sownOn.slice(5, 7)) + 1);
  }
  return [...months].sort((a, b) => a - b);
}

export function seasonSummary(rows: readonly HarvestRecord[], subject: { readonly by: 'crop' | 'parcel'; readonly id: string },
  season: { readonly from: string; readonly to: string }) {
  if (!isCalendarDate(season.from) || !isCalendarDate(season.to) || season.from > season.to) return undefined;
  const months = new Map<string, HarvestRecord[]>();
  const scoped: HarvestRecord[] = [];
  const undated: string[] = [];
  for (const row of rows) {
    if ((subject.by === 'crop' ? row.cropId : row.parcelId) !== subject.id) continue;
    const day = recordedDay(row.at);
    if (!day) { undated.push(row.id); continue; }
    if (day < season.from || day > season.to) continue;
    scoped.push(row);
    const key = day.slice(0, 7);
    const members = months.get(key) ?? [];
    members.push(row);
    months.set(key, members);
  }
  return {
    overall: bucket(scoped),
    months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, members]) => ({ month, ...bucket(members) })),
    undated,
  };
}
