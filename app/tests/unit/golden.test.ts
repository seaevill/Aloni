import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareDecimal, known, parseDecimal, parseInstant, parsePhiDays, parseReiHours, phiEnd, reiEnd, supplyTable, type Decimal } from '../../../packages/rules-core/src/index';
import { stockHits, type StockFacts } from '../../../packages/rules-core/src/stock';

// The 27 golden cases of the rules engine (packages/rules-core/fixtures/golden, Demo-farm data only). Every case is CHECKED FOR SHAPE; the ones for which the engine has code are RUN against the file itself
// (not a copy). The others are SKIPPED with the reason and are counted in docs/STATUS.md: a skipped case is a case the engine cannot run yet, never a passed one.
type J = Record<string, unknown>;
const DIR = new URL('../../../packages/rules-core/fixtures/golden/', import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const cases = new Map(files.map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(f, DIR), 'utf8')) as J]));
const o = (v: unknown): J => v as J;
const arr = (v: unknown): J[] => (Array.isArray(v) ? (v as J[]) : []);
const utc = (s: unknown): string => new Date(String(s)).toISOString().replace(/\.\d{3}Z$/, 'Z');
const dec = (s: unknown): Decimal => { const r = parseDecimal(String(s)); if (!r.known) throw new Error(`not a decimal: ${String(s)}`); return r.value; };

function supply(c: J) {
  const inp = o(c.inputs); const ex = o(o(c.expected).values);
  const logged = (id: unknown) => arr(inp.jobs).filter((j) => j.kind === 'harvest' && j.planting_id === id).reduce((a, j) => a + Number(j.crates), Number('0'));
  const plantings = arr(inp.plantings).map((p) => ({ id: String(p.id), cropId: String(p.crop_id), estCrates: Number(p.est_crates), loggedCrates: logged(p.id), harvestFrom: String(p.harvest_from), harvestTo: String(p.harvest_to), safeFrom: typeof p.safe_from === 'string' ? p.safe_from : undefined }));
  const ow = arr(inp.orders_weekly)[0]!;
  const mult = arr(ow.multipliers).map((m) => ({ weekStart: String(m.week_start), factor: Number(m.factor) }));
  const weeks = (ex.weeks as string[]).length;
  const rows = supplyTable(String(c.as_of), weeks, plantings, { cropId: String(ow.crop_id), cratesPerWeek: Number(ow.crates_per_week), multipliers: mult });
  expect(rows.map((r) => r.week)).toEqual(ex.weeks);
  const tol = Number(o(o(c.expected).tolerance).crates);
  rows.forEach((r, i) => expect(Math.abs(r.supply - (ex.supply as number[])[i]!)).toBeLessThanOrEqual(tol));
  for (const [pid, vals] of Object.entries(o(ex.supply_by_planting))) rows.forEach((r, i) => expect(Math.abs(r.byPlanting[pid]! - (vals as number[])[i]!)).toBeLessThanOrEqual(tol));
}

function stock(c: J) {
  const inp = o(c.inputs); const syn = o(c.synthetic_inputs ?? {}); const ex = o(c.expected); const p = o(o(o(c.rule_state).params));
  const planned = [...arr(inp.planned_jobs), ...arr(syn.planned_jobs)].map((j) => ({ id: String(j.id), productId: String(j.product_id), areaStr: parseDecimal(String(j.area_str)), dosePerStr: parseDecimal(String(j.dose_per_str)), doseUnit: String(arr(inp.stock).find((s) => s.product_id === j.product_id)?.unit) }));
  const labelDose: Record<string, string> = {};
  for (const l of arr(inp.label_uses)) labelDose[String(l.product_id)] = String(l.dose_min_per_str);
  const facts: StockFacts = { lots: arr(inp.stock).map((s) => ({ productId: String(s.product_id), qty: parseDecimal(String(s.qty)), unit: String(s.unit), expiry: typeof s.expiry === 'string' ? s.expiry : undefined })), planned, labelDose, lowFactor: known(dec(o(p.low_factor).value)), expiringDays: Number(o(p.expiring_days).value) };
  const hits = stockHits(facts, utc(c.as_of));
  const want = hits.filter((h) => h.category === ex.category && h.productId === (o(ex.targets).product_ids as string[])[0]);
  expect(want).toHaveLength(1);
  for (const [k, v] of Object.entries(o(ex.values))) if (k in want[0]!.values && typeof v === 'string' && k !== 'label_dose_el') expect(String(want[0]!.values[k])).toBe(v);
  if (ex.category === 'stock_low') expect(compareDecimal(dec(want[0]!.values.threshold_qty), dec('0.18'))).toBe(0);
  if (ex.category === 'stock_expiring') expect(want[0]!.values.days_left).toBe(o(ex.values).days_left);
  for (const m of arr(ex.must_not)) { const cat = o(m.match).category; if (typeof cat === 'string') expect(hits.some((h) => h.category === cat && h.productId === (o(ex.targets).product_ids as string[])[0] && o(m.match).values === undefined)).toBe(false); }
}

const phiOf = (c: J, jobId: string, plantingId: string, withEnd: boolean) => {
  const job = [...arr(o(c.inputs).jobs), ...arr(o(c.synthetic_inputs ?? {}).jobs)].find((j) => j.id === jobId)!;
  const crop = arr(o(c.inputs).plantings).find((p) => p.id === plantingId)?.crop_id;
  const label = arr(o(c.inputs).label_uses).find((l) => l.product_id === job.product_id && l.crop_id === crop);
  const days = label === undefined ? parsePhiDays('') : parsePhiDays(String(label.phi_days));
  return phiEnd(withEnd && typeof job.ended_at === 'string' ? utc(job.ended_at) : '', days);
};

const RUN: Record<string, (c: J) => void> = {
  'A05-gap-spinach': supply,
  'NEG-P0-2-phi-lot-not-supply': supply,
  'A06-stock-low-mandipropamid': stock, 'A07-stock-expired-acetamiprid': stock, 'A08-stock-expiring-spinosad': stock,
  'A04-phi-parsley-geraneia': (c) => {
    const end = phiOf(c, 'J15', 'PL12', true);
    expect(end.known && Date.parse(end.value)).toBe(Date.parse(String(o(o(c.expected).values).safe_from)));
  },
  'REI-after-r01-spray': (c) => {
    const job = arr(o(c.synthetic_inputs).jobs)[0]!;
    const rei = reiEnd(utc(job.ended_at), parseReiHours(String(arr(o(c.inputs).label_uses)[0]!.rei_h)));
    expect(rei.known && Date.parse(rei.value)).toBe(Date.parse(String(o(o(c.expected).values).reentry_at)));   // from the END of the spraying, never from midnight
  },
  'NEG-PHI-no-label-row-blocks': (c) => { expect(phiOf(c, 'J-X1', 'PL09', true).known).toBe(false); expect(o(o(c.expected).values).safe_from).toBeNull(); },
  'NEG-PHI-no-end-time-blocks': (c) => { expect(phiOf(c, 'J-X1', 'PL09', true).known).toBe(false); expect(parseInstant('').known).toBe(false); expect(o(o(c.expected).values).safe_from).toBeNull(); },
};
const WHY = 'no engine code for this rule yet (frost, spray window, rotation, nitrogen, sowing, regulation, salt, harvest forecast): needs M3+ and the signed thresholds';

describe('golden cases: shape (all of them)', () => {
  it('there are 27, named like their file, Demo farm only, with a decision mode and a rule', () => {
    expect(cases.size).toBe(27);
    for (const [id, c] of cases) {
      expect(c.id, id).toBe(id); expect(c.schema_version, id).toBe(1); expect(c.farm, id).toBe('demo');
      expect(['golden', 'derived', 'negative'], id).toContain(c.case_type);
      expect(typeof c.rule_id, id).toBe('string'); expect(Number.isNaN(Date.parse(String(c.as_of))), id).toBe(false);
      expect(['decide', 'info_only'], id).toContain(o(c.expected).mode);
    }
  });
  it('the cases that are run all exist, and the rest is counted (see STATUS)', () => {
    for (const id of Object.keys(RUN)) expect(cases.has(id), id).toBe(true);
    expect(cases.size - Object.keys(RUN).length).toBe(18);       // skipped; update docs/STATUS.md when this number changes
  });
});

describe('golden cases: run against the engine', () => {
  for (const [id, c] of cases) (RUN[id] ? it : it.skip)(`${id}${RUN[id] ? '' : ` (skipped: ${WHY})`}`, () => { RUN[id]!(c); });
});
