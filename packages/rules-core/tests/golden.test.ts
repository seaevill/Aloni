import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint, known, makeDose, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, requireSignOff, runRules, type DoseUnit, type LabelUse, type Output, type Snapshot, type UseFact } from '../src/index';

// The golden cases (Demo farm, `fixtures/golden/`): each JSON file is one case. A case is either LANDED (its rule is built: it must pass) or PENDING
// (its rule is not built yet: skipped, with the reason). Every file must be in exactly one list, so a new case cannot be forgotten, and a landed case can
// never be skipped. `synthetic_inputs` and the test-only max applications are test data, never label data.
type J = Record<string, any>;
const DIR = new URL('../fixtures/golden/', import.meta.url);
const cases: J[] = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')) as J);
export const LANDED = ['A04-phi-parsley-geraneia', 'NEG-PHI-no-label-row-blocks', 'NEG-REG-exclude-unregistered-beds', 'NEG-ROT-unknown-group', 'NEG-unsigned-rule-info-only', 'REI-after-r01-spray'];

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/;
const ms = (v: unknown): unknown => (typeof v === 'string' && ISO.test(v) ? Date.parse(v) : v); // times compare as instants, whatever their offset
const utc = (iso: string) => new Date(Date.parse(iso)).toISOString().replace(/\.\d{3}Z$/, 'Z');
const UNIT: Record<string, DoseUnit> = { 'L/στρ': 'l/str', 'kg/στρ': 'kg/str', 'ml/στρ': 'ml/str', 'g/στρ': 'g/str' };

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
    jobs: jobs.map((j) => ({ id: j.id, kind: j.kind, status: j.status ?? 'done', plantingIds: j.planting_ids, productId: j.product_id, startedAt: utc(j.started_at), endedAt: j.ended_at ? utc(j.ended_at) : undefined })),
    tasks: ((syn.worker_tasks ?? []) as J[]).map((t) => ({ id: t.id, plantingIds: t.planting_ids, at: utc(t.at) })),
    draftJobs: ([...(syn.draft_job ? [syn.draft_job] : []), ...(syn.draft_jobs ?? [])] as J[]).map((j) => ({ id: j.id, kind: j.kind, plantingIds: j.planting_ids, productId: j.product_id })),
    products: ((c.inputs.products ?? []) as J[]).map((p) => ({ id: p.id, groupCode: p.group_code ?? undefined })),
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
  for (const [k, v] of Object.entries((e.values ?? {}) as J)) expect(matches(o.values[k], v), `values.${k}: ${JSON.stringify(o.values[k])} vs ${JSON.stringify(v)}`).toBe(true);
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
