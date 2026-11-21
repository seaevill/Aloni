import type { Output, Snapshot, Veto } from './engine';
import { parseDecimal } from './decimal';
import { athensDate } from './stock';
import { dateAfterDays, isCalendarDate } from './waits';

export interface SowingParcel {
  readonly id: string;
  readonly freeArea: string;
  readonly soil?: number;
  readonly history: readonly { readonly family: string; readonly date?: string }[];
  readonly flags: readonly { readonly family: string; readonly source: string }[];
  readonly rain: readonly { readonly date: string; readonly mm: number; readonly forecast: boolean }[];
}
export interface SowingFacts {
  readonly cropId: string;
  readonly cropFamily: string;
  readonly area: string;
  readonly sameFamilyYears: number;
  readonly rainDays: number;
  readonly maxRain: number;
  readonly minSoil: number;
  readonly maxSoil: number;
  readonly yieldKgPerArea: number;
  readonly crateKg: number;
  readonly wastePercent: number;
  readonly parcels: readonly SowingParcel[];
}

type SowingOutput = Pick<Output, 'rule_id' | 'kind' | 'category'> & Partial<Output>;
const count = (n: number) => Number.isSafeInteger(n) && n > 0;
const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;

function rainWindow(p: SowingParcel, today: string, days: number, limit: number) {
  const measured = new Map(p.rain.filter((r) => isCalendarDate(r.date) && nonnegative(r.mm)).map((r) => [r.date, r.mm]));
  const forecasts = p.rain.filter((r) => r.forecast && isCalendarDate(r.date) && r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const window = [];
  let next = today;
  for (const row of forecasts) {
    if (row.date !== next) break;
    let mm = 0;
    let complete = true;
    for (let offset = 0; offset < days; offset++) {
      const date = dateAfterDays(row.date, -offset);
      const rain = date.known ? measured.get(date.value) : undefined;
      if (rain === undefined) { complete = false; break; }
      mm += rain;
    }
    if (!complete || mm > limit) break;
    window.push(row.date);
    const following = dateAfterDays(row.date, 1);
    if (!following.known) break;
    next = following.value;
  }
  return window;
}

export function sowingWindow(s: Snapshot): SowingOutput[] {
  const facts = s.sowing;
  if (!facts) return [];
  const base = { rule_id: 'SOW', crop_ids: [facts.cropId] };
  if (s.ruleStatus.SOW !== 'signed') return [{ ...base, kind: 'info', category: 'sowing_inputs', values: { badge: 'not_signed_off' } }];
  const area = parseDecimal(facts.area);
  if (!area.known || parseFloat(area.value) <= 0 || !count(facts.sameFamilyYears) || facts.sameFamilyYears > 100 ||
      !count(facts.rainDays) || facts.rainDays > 366 || !nonnegative(facts.maxRain) ||
      !Number.isFinite(facts.minSoil) || !Number.isFinite(facts.maxSoil) || facts.minSoil > facts.maxSoil ||
      !nonnegative(facts.yieldKgPerArea) || !Number.isFinite(facts.crateKg) || facts.crateKg <= 0 ||
      !nonnegative(facts.wastePercent) || facts.wastePercent > 100) {
    return [{ ...base, kind: 'info', category: 'sowing_unknown', values: { reason: 'incomplete_signed_inputs' } }];
  }
  const today = athensDate(s.asOf);
  const cutoff = new Date(today);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - facts.sameFamilyYears);
  const earliest = cutoff.toISOString().split('T')[0];
  const rejected: Record<string, string[]> = {};
  const vetoes: Veto[] = [];
  const candidates: Array<{ id: string; window: { start: string; end: string } }> = [];
  for (const parcel of facts.parcels) {
    const reasons: string[] = [];
    for (const flag of parcel.flags.filter((r) => r.family === facts.cropFamily)) {
      if (!reasons.includes('disease_flag')) reasons.push('disease_flag');
      vetoes.push({ by: flag.source, vetoed: 'sow', parcel_id: parcel.id, reason: 'disease_flag_family' });
    }
    for (const item of parcel.history.filter((r) => r.family === facts.cropFamily)) {
      if (!item.date || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/u.test(item.date)) reasons.push('unknown_history');
      else if (item.date >= earliest.slice(0, item.date.length)) reasons.push('same_family_recent');
    }
    const free = parseDecimal(parcel.freeArea);
    if (!free.known) reasons.push('unknown_free_area');
    else if (parseFloat(free.value) < parseFloat(area.value)) reasons.push('insufficient_free_area');
    if (!reasons.length) {
      const soil = parcel.soil;
      if (soil === undefined || !Number.isFinite(soil)) reasons.push('unknown_soil_temperature');
      else if (soil < facts.minSoil || soil > facts.maxSoil) reasons.push('soil_outside_recorded_range');
      else {
        const window = rainWindow(parcel, today, facts.rainDays, facts.maxRain);
        const end = window.at(-1);
        if (end === undefined) reasons.push('no_verified_rain_window');
        else candidates.push({ id: parcel.id, window: { start: today, end } });
      }
    }
    if (reasons.length) rejected[parcel.id] = [...new Set(reasons)];
  }
  const crates = parseFloat(area.value) * facts.yieldKgPerArea / facts.crateKg * (1 - facts.wastePercent / 100);
  return Number.isFinite(crates) ? candidates.map((candidate) => ({
    ...base, kind: 'recommendation', category: 'sow', confidence: 'medium', parcel_ids: [candidate.id], window: candidate.window,
    values: { area_str: area.value, expected_crates: crates, variety_prompt: true, chosen_variety: null, rejected }, vetoes,
  })) : [];
}
