import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint, known, makeDose, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, requireSignOff, runRules, type DoseUnit, type Hour, type LabelUse, type Sun, type Output, type Snapshot, type UseFact, type FrostParcel, type Topo } from '../src/index';

// The golden cases (Demo farm, `fixtures/golden/`): each JSON file is one case. A case is either LANDED (its rule is built: it must pass) or PENDING
// (its rule is not built yet: skipped, with the reason). Every file must be in exactly one list, so a new case cannot be forgotten, and a landed case can
// never be skipped. `synthetic_inputs` and the test-only max applications are test data, never label data.
type J = Record<string, any>;
const DIR = new URL('../fixtures/golden/', import.meta.url);
const cases: J[] = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')) as J);
export const LANDED = ['A01-frost-low-plain', 'A04-phi-parsley-geraneia', 'A09-front-closes-spray-windows', 'NEG-PHI-no-label-row-blocks', 'NEG-REG-exclude-unregistered-beds', 'NEG-ROT-unknown-group', 'NEG-unsigned-rule-info-only', 'R05-frost-cover-herbs', 'REI-after-r01-spray'];

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/;
const ms = (v: unknown): unknown => (typeof v === 'string' && ISO.test(v) ? Date.parse(v) : v); // times compare as instants, whatever their offset
const utc = (iso: string) => new Date(Date.parse(iso)).toISOString().replace(/\.\d{3}Z$/, 'Z');
const UNIT: Record<string, DoseUnit> = { 'L/στρ': 'l/str', 'kg/στρ': 'kg/str', 'ml/στρ': 'ml/str', 'g/στρ': 'g/str' };

/** Hourly forecast, sun times and thresholds of a case (Athens in November = +02:00). */
function weatherOf(c: J): Pick<Snapshot, 'weather' | 'sprayParams'> {
  const syn: J = c.synthetic_inputs ?? {};
  if (!syn.weather_hourly) return {};
  const v = (k: string) => (c.rule_state.params[k]?.value as number);
  const hours: Record<string, Hour[]> = {};
  for (const [p, list] of Object.entries(syn.weather_hourly as J)) hours[p] = (list as J[]).map((h) => ({ time: utc(h.time), day: String(h.time).slice(0, 10), tempC: h.temp_c, rhPct: h.rh_pct, windKmh: h.wind_kmh, gustKmh: h.gust_kmh, rainMm: h.rain_mm, cloudOktas: h.cloud_oktas, leafWet: h.leafwet_est }));
  const sun: Record<string, Sun> = {};
  for (const [d, t] of Object.entries((syn.sun ?? {}) as J)) sun[d] = { sunrise: utc(`${d}T${t.sunrise}:00+02:00`), sunset: utc(`${d}T${t.sunset}:00+02:00`) };
  const rainDaily: Record<string, Record<string, number>> = {};
  for (const [p, rows] of Object.entries((c.inputs.weather_daily ?? {}) as J)) rainDaily[p] = Object.fromEntries((rows as J[]).map((r) => [r.date, r.rain_mm]));
  return { weather: { hours, sun, rainDaily }, sprayParams: { windMin: v('wind_min_kmh'), windMax: v('wind_max_kmh'), gustMax: v('gust_max_kmh'), dryBeforeH: v('dry_before_h'), rainLookaheadH: v('rain_lookahead_h'), rainMaxMm: v('rain_max_mm'), deltaTMin: v('delta_t_min'), deltaTMax: v('delta_t_max'), tempMax: v('temp_max_c'), inversionAfterSunriseH: v('inversion_after_sunrise_h') } };
}

/** Frost thresholds, nights and topo classes of a case. The crop lists are TEST-ONLY (the case text names them); the real ones are [SET] by the agronomist. */
function frostOf(c: J): Pick<Snapshot, 'frost'> {
  const syn: J = c.synthetic_inputs ?? {};
  if (c.rule_id !== 'FROST' || !syn.topo_class || !syn.night_cloud_oktas) return {};
  const v = (k: string) => (c.rule_state.params[k]?.value as number);
  const off = c.rule_state.params.cold_pool_offset_c.value as Record<Topo, number>;
  const parcels: Record<string, FrostParcel> = {};
  for (const [pid, rows] of Object.entries((c.inputs.weather_daily ?? {}) as J)) {
    const elevationM = ((c.inputs.parcels as J[]).find((p) => p.id === pid) as J).elevation_m as number;
    const nights = Object.entries(syn.night_cloud_oktas as J).map(([night, cloud]) => {
      const [from, to] = night.split('/'); const row = (rows as J[]).find((r) => r.date === to) as J;
      return { night, from, to, tminC: row.tmin as number, windKmh: row.wind_kmh as number, cloudOktas: cloud as number };
    });
    parcels[pid] = { elevationM, topo: syn.topo_class[pid] as Topo, nights };
  }
  return { frost: { parcels, tenderCrops: ['coriander', 'dill'], guardCrops: ['spinach', 'chicory', 'endive'], coversOnHand: !!syn.covers_on_hand,
    params: { tminMaxC: v('tmin_2m_max_c'), windMaxKmh: v('wind_max_kmh'), cloudMaxOktas: v('cloud_max_oktas'), elevationMaxM: v('elevation_max_m'), offsetC: { plain: off.plain, slope: off.slope, coastal: off.coastal }, leafBelowAirC: c.rule_state.params.leaf_below_air_c.value, coverGainC: [1, 2] /* EST, test-only */ } } };
}

function snapshot(c: J): Snapshot {
  const syn: J = c.synthetic_inputs ?? {};
  const uses: UseFact[] = ((c.inputs.label_uses ?? []) as J[]).map((l) => {
    const use: LabelUse = { scope: '', dose: makeDose(known('single'), known(UNIT[l.dose_unit]), parseDecimal(l.dose_min_per_str), parseDecimal('')), phiDays: parsePhiDays(String(l.phi_days)), reiHours: parseReiHours(String(l.rei_h)), maxApps: parseMaxApps('9') /* TEST-ONLY: the fixture has no value */ };
    return { productId: l.product_id, cropId: l.crop_id, ...(l.max_apps === null ? {} : { maxApps: l.max_apps as number }), ...(l.min_interval_days === null ? {} : { minIntervalDays: l.min_interval_days as number }), signed: requireSignOff(use, { by: 'test', on: '2026-11-01', fingerprint: fingerprint(use) }) };
  });
  const jobs = [...(c.inputs.jobs ?? []), ...(syn.jobs ?? [])] as J[];
  return {
    asOf: utc(c.as_of), uses, parcelsForInfo: ((c.inputs.parcels ?? []) as J[]).map((p) => p.id),
    plantings: ((c.inputs.plantings ?? []) as J[]).map((p) => ({ id: p.id, parcelId: p.parcel_id, cropId: p.crop_id })),
    jobs: jobs.map((j) => ({ id: j.id, kind: j.kind, status: j.status ?? 'done', plantingIds: j.planting_ids, productId: j.product_id, startedAt: utc(j.started_at), endedAt: utc(j.ended_at ?? j.started_at) /* the phone records ONE time, the END; the prototype's single time is that time */ })),
    tasks: ((syn.worker_tasks ?? []) as J[]).map((t) => ({ id: t.id, plantingIds: t.planting_ids, at: utc(t.at) })),
    draftJobs: ([...(syn.draft_job ? [syn.draft_job] : []), ...(syn.draft_jobs ?? [])] as J[]).map((j) => ({ id: j.id, kind: j.kind, plantingIds: j.planting_ids, productId: j.product_id })),
    products: ((c.inputs.products ?? []) as J[]).map((p) => ({ id: p.id, groupCode: p.group_code ?? undefined })),
    ...weatherOf(c), ...frostOf(c),
    ruleStatus: { [c.rule_id]: c.rule_state.status === 'unsigned' ? 'unsigned' : 'signed' },
  };
}

/** Partial deep match with the README's operators; a scalar pattern against an array means «contains». */
function matches(actual: unknown, pat: unknown): boolean {
  if (pat && typeof pat === 'object' && !Array.isArray(pat)) {
    const p = pat as J;
    if (Object.keys(p).some((k) => k.startsWith('$'))) {
      return Object.entries(p).every(([op, v]) => {
        const a = ms(actual); const b = ms(v);
        if (op === '$exists') return (actual !== undefined) === v;
        if (op === '$ne') return a !== b;
        if (op === '$in') return (v as unknown[]).map(ms).includes(a);
        if (op === '$gt') return (a as number) > (b as number);
        if (op === '$gte') return (a as number) >= (b as number);
        if (op === '$lt') return (a as number) < (b as number);
        return (a as number) <= (b as number); // $lte
      });
    }
    return actual !== null && typeof actual === 'object' && Object.entries(p).every(([k, v]) => matches((actual as J)[k], v));
  }
  if (Array.isArray(pat)) return Array.isArray(actual) && pat.every((v, i) => matches(actual[i], v));
  return Array.isArray(actual) ? actual.map(ms).includes(ms(pat)) : ms(actual) === ms(pat);
}
const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');

function check(c: J, outs: Output[]): void {
  const e = c.expected as J;
  const own = outs.filter((o) => o.rule_id === c.rule_id && o.category === e.category);
  expect(own.length, `an output ${c.rule_id}/${e.category}`).toBeGreaterThan(0);
  const o = own.find((x) => !e.targets?.planting_ids || sameSet(x.planting_ids, e.targets.planting_ids)) ?? own[0];
  expect(o.kind).toBe(e.kind);
  if (e.mode === 'decide') expect(o.notify).toBe(false); // M3 sends nothing yet
  if (e.severity !== undefined && e.severity !== null) expect(o.severity).toBe(e.severity);
  if (e.confidence) expect(o.confidence).toBe(e.confidence);
  for (const k of ['parcel_ids', 'planting_ids', 'product_ids', 'crop_ids'] as const) if (e.targets?.[k]) expect(sameSet(o[k], e.targets[k]), `${k}: ${o[k]}`).toBe(true);
  if (e.window) { expect(ms(o.window?.start)).toBe(ms(e.window.start)); expect(ms(o.window?.end)).toBe(ms(e.window.end)); }
  // These two expected values are prose in the fixture («range = tmin − 3 … tmin − 1», «1–2 (EST)»): the structured values are checked instead.
  const PROSE = ['leaf_surface_estimate_c', 'cover_gain_c'];
  if (e.values?.leaf_surface_estimate_c) for (const [i, n] of (o.values.nights as J[]).entries()) for (const [pid, t] of Object.entries(n).filter(([k]) => k !== 'night')) {
    const r = (o.values.leaf_range_c as J[])[i][pid] as number[]; expect(r[0], `${pid} lo`).toBeCloseTo((t as number) - 3, 9); expect(r[1], `${pid} hi`).toBeCloseTo((t as number) - 1, 9);
  }
  if (e.values?.cover_gain_c) expect(o.values.cover_gain_range_c).toEqual([1, 2]);
  for (const [k, v] of Object.entries((e.values ?? {}) as J).filter(([k]) => !PROSE.includes(k))) expect(matches(o.values[k], v), `values.${k}: ${JSON.stringify(o.values[k])} vs ${JSON.stringify(v)}`).toBe(true);
  for (const a of (e.also ?? []) as J[]) expect(outs.some((x) => matches(x, a)), `also ${JSON.stringify(a)}`).toBe(true);
  for (const v of (e.vetoes ?? []) as J[]) expect(outs.some((x) => x.vetoes.some((y) => matches(y, v))), `veto ${JSON.stringify(v)}`).toBe(true);
  for (const m of (e.must_not ?? []) as J[]) expect(outs.filter((x) => matches(x, m.match)), `must_not ${m.id}`).toEqual([]);
}

describe('golden cases', () => {
  it('every case file is a Demo-farm case named after its id and is classified (landed or pending)', () => {
    expect(cases).toHaveLength(26);
    for (const c of cases) { expect(c.farm).toBe('demo'); expect(c.expected.must_not?.length, c.id).toBeGreaterThan(0); }
    for (const id of LANDED) expect(cases.some((c) => c.id === id), id).toBe(true);
  });
  for (const c of cases) {
    const landed = LANDED.includes(c.id as string);
    (landed ? it : it.skip)(`${c.id}${landed ? '' : ' (pending: its rule is not built yet)'}`, () => check(c, runRules(snapshot(c))));
  }
  it('the matcher itself goes red: an output that breaks a must_not is caught, a time in another offset still matches', () => {
    expect(matches({ rule_id: 'FROST', kind: 'alert' }, { rule_id: 'FROST', kind: { $in: ['alert', 'block'] } })).toBe(true);
    expect(matches({ values: { reentry_at: '2026-11-19T11:00:00Z' } }, { values: { reentry_at: '2026-11-19T13:00:00+02:00' } })).toBe(true);
    expect(matches({ values: { reentry_at: '2026-11-19T11:00:00Z' } }, { values: { reentry_at: { $lt: '2026-11-19T13:00:00+02:00' } } })).toBe(false);
    expect(matches({ planting_ids: ['PL01', 'PL02'] }, { planting_ids: 'PL02' })).toBe(true);
  });
});
