import { describe, expect, it } from 'vitest';
import { fingerprint, known, makeDose, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, parseInstant, requireSignOff, runRules, type LabelUse, type Snapshot, type UseFact } from './index';

function seeded(seed: number) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x; }; }
const pad = (n: number) => String(n).padStart(2, '0');
const at = (y: number, mo: number, d: number, h: number, mi: number, s: number) => `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}Z`;
const secs = (z: string) => { const p = parseInstant(z); return p.known ? p.value.day * 86400 + p.value.sec : NaN; };

const use = (phi: string, rei: string, signed: boolean): UseFact => {
  const u: LabelUse = { scope: '', dose: makeDose(known('single'), known('ml/str'), parseDecimal('0,025'), parseDecimal('')), phiDays: parsePhiDays(phi), reiHours: parseReiHours(rei), maxApps: parseMaxApps('3') };
  return { productId: 'prod', cropId: 'crop', signed: requireSignOff(u, signed ? { by: 'A', on: '2026-11-17', fingerprint: fingerprint(u) } : undefined) };
};
const snap = (over: Partial<Snapshot>): Snapshot => ({
  asOf: '2026-11-20T00:00:00Z', plantings: [{ id: 'pl', parcelId: 'p', cropId: 'crop' }], uses: [use('7', '24', true)], tasks: [], ruleStatus: {}, parcelsForInfo: [], draftJobs: [], products: [],
  jobs: [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: '2026-11-18T09:00:00Z' }], ...over,
});

describe('the engine never shortens a waiting period and never decides from what is not signed', () => {
  it('property (1000 sprays): the PHI hold ends exactly PHI × 24 h after the spray, is on while it runs and gone after it, and no date is earlier', () => {
    const rnd = seeded(31);
    for (let i = 0; i < 1000; i += 1) {
      const start = at(2026, 1 + (rnd() % 12), 1 + (rnd() % 28), rnd() % 24, rnd() % 60, rnd() % 60);
      const phi = rnd() % 60;
      const s0 = secs(start);
      const base = snap({ jobs: [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: start, endedAt: undefined }], uses: [use(String(phi), '24', true)] });
      const out = runRules({ ...base, asOf: start }).filter((o) => o.rule_id === 'PHI');
      expect(out, start).toHaveLength(1);
      expect(secs(String(out[0].values.safe_from)) - s0, start).toBe(phi * 86400); // exact
      expect(out[0].values.safe_from).toBe(out[0].window?.end);
    }
  });
  it('after the end the hold is gone; one second before it is still on', () => {
    const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: undefined }];
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T07:59:59Z' })).some((o) => o.category === 'phi_hold')).toBe(true);
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T08:00:00Z' })).some((o) => o.category === 'phi_hold')).toBe(true); // at the second: still on
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T08:00:01Z' })).some((o) => o.category === 'phi_hold')).toBe(false);
  });
  it('an unsigned, incomplete or missing label gives «blocked» with NO date, never a default PHI', () => {
    for (const uses of [[use('7', '24', false)], [use('', '24', true)], [use('7', 'NaN', true)], []]) {
      const out = runRules(snap({ uses })).filter((o) => o.rule_id === 'PHI');
      expect(out, JSON.stringify(uses.length)).toHaveLength(1);
      expect(out[0]).toMatchObject({ category: 'phi_blocked_unknown', values: { lot_status: 'blocked', safe_from: null }, vetoes: [{ by: 'PHI', vetoed: 'harvest' }] });
    }
  });
  it('REI counts from the END of the spraying, never from midnight and never shorter; tasks before it are vetoed', () => {
    const out = runRules(snap({ asOf: '2026-11-18T10:00:00Z', tasks: [{ id: 'T1', plantingIds: ['pl'], at: '2026-11-19T08:00:00Z' }, { id: 'T2', plantingIds: ['pl'], at: '2026-11-19T09:30:00Z' }] })).filter((o) => o.rule_id === 'REI');
    expect(out).toHaveLength(1);
    expect(out[0].values).toMatchObject({ reentry_at: '2026-11-19T09:00:00Z', blocked_task_ids: ['T1'], allowed_task_ids: ['T2'] });
  });
  it('a rule whose own thresholds are unsigned only SHOWS its inputs: no alert, no severity, no notification', () => {
    const out = runRules(snap({ ruleStatus: { FROST: 'unsigned' }, parcelsForInfo: ['p'] })).filter((o) => o.rule_id === 'FROST');
    expect(out).toEqual([expect.objectContaining({ kind: 'info', notify: false, values: expect.objectContaining({ badge: 'not_signed_off' }) })]);
    expect(out[0].severity).toBeUndefined();
    expect(runRules(snap({ ruleStatus: { FROST: 'signed' }, parcelsForInfo: ['p'] })).some((o) => o.rule_id === 'FROST')).toBe(false); // not built yet: nothing invented
  });
  it('an unreadable «now» decides nothing', () => {
    for (const asOf of ['Invalid Date', '', 'NaN', '2026-11-20']) expect(runRules(snap({ asOf })), asOf).toEqual([]);
  });
});

describe('REG and ROT: a draft spray never covers beds that are not on a signed label, and a missing value is never «cleared»', () => {
  const two = [{ id: 'pl', parcelId: 'p', cropId: 'crop' }, { id: 'pl2', parcelId: 'p', cropId: 'other' }];
  const draft = { id: 'd', kind: 'spray', plantingIds: ['pl', 'pl2'], productId: 'prod' };
  it('only the planting whose crop is on the signed label is allowed; the others are excluded one by one', () => {
    const o = runRules(snap({ plantings: two, draftJobs: [draft], jobs: [] })).filter((x) => x.rule_id === 'REG');
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ kind: 'block', values: { allowed_planting_ids: ['pl'], exclude_planting_ids: ['pl2'] }, vetoes: [{ by: 'REG', vetoed: 'spray', planting_id: 'pl2', reason: 'not_on_label' }] });
  });
  it('an UNSIGNED label registers nothing: every bed is excluded', () => {
    const o = runRules(snap({ plantings: two, draftJobs: [draft], jobs: [], uses: [use('7', '24', false)] })).filter((x) => x.rule_id === 'REG');
    expect(o[0].values.allowed_planting_ids).toEqual([]);
  });
  it('rotation: no group code, no maximum applications or no minimum interval = unknown, listed, never «pass»', () => {
    const o = runRules(snap({ draftJobs: [{ ...draft, plantingIds: ['pl'] }], jobs: [], products: [{ id: 'prod', groupCode: undefined }] })).filter((x) => x.rule_id === 'ROT');
    expect(o).toHaveLength(1);
    expect(o[0].values).toEqual({ status: 'unknown', missing: ['group_code', 'max_apps', 'min_interval_days'] });
    const full = runRules(snap({ draftJobs: [{ ...draft, plantingIds: ['pl'] }], jobs: [], products: [{ id: 'prod', groupCode: '40' }], uses: [{ ...use('7', '24', true), maxApps: 3, minIntervalDays: 7 }] }));
    expect(full.some((x) => x.rule_id === 'ROT')).toBe(false);
  });
});

describe('PHI and REI count from the END of the spraying (the safe side)', () => {
  it('with a known end, the PHI hold runs from the end, not from the start', () => {
    const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: '2026-11-18T10:30:00Z' }];
    const out = runRules(snap({ jobs: j, asOf: '2026-11-18T12:00:00Z' })).filter((o) => o.rule_id === 'PHI');
    expect(out[0].values.safe_from).toBe('2026-11-25T10:30:00Z'); // end + 7 days, not start + 7 days
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T10:00:00Z' })).some((o) => o.category === 'phi_hold')).toBe(true); // 08:00 + 7 d would already be over
  });
  it('property (500 sprays): the hold ends exactly PHI × 24 h after the END, never before the end-based date', () => {
    const rnd = seeded(77);
    for (let i = 0; i < 500; i += 1) {
      const [mo, d] = [1 + (rnd() % 12), 1 + (rnd() % 27)];
      const start = at(2026, mo, d, rnd() % 20, rnd() % 60, rnd() % 60);
      const end = at(2026, mo, d, 20 + (rnd() % 4), rnd() % 60, rnd() % 60); // the same day, later in the evening
      const phi = rnd() % 40;
      const out = runRules(snap({ jobs: [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: start, endedAt: end }], uses: [use(String(phi), '24', true)], asOf: start })).filter((o) => o.rule_id === 'PHI');
      expect(secs(String(out[0].values.safe_from)) - secs(end), `${start} ${end}`).toBe(phi * 86400);
    }
  });
});

describe('SPRAY-WIN: unsigned thresholds only show data', () => {
  const hours = Array.from({ length: 30 }, (_, i) => ({ time: `2026-11-20T${String(i % 24).padStart(2, '0')}:00:00Z`, day: '2026-11-20', tempC: 8, rhPct: 94, windKmh: 30, gustKmh: 60, rainMm: 2, cloudOktas: 6, leafWet: true }));
  const weather = { hours: { p: hours }, sun: { '2026-11-20': { sunrise: '2026-11-20T05:10:00Z', sunset: '2026-11-20T15:07:00Z' } }, rainDaily: { p: { '2026-11-20': 6.5 } } };
  const sprayParams = { windMin: 3, windMax: 10, gustMax: 20, dryBeforeH: 1, rainLookaheadH: 3, rainMaxMm: 0.2, deltaTMin: 2, deltaTMax: 8, tempMax: 28, inversionAfterSunriseH: 2 };
  it('signed (for test): a day with no OK hour raises the medium «window closed» alert; it never notifies', () => {
    const o = runRules(snap({ weather, sprayParams, ruleStatus: { 'SPRAY-WIN': 'signed' } })).filter((x) => x.rule_id === 'SPRAY-WIN');
    expect(o).toEqual([expect.objectContaining({ kind: 'alert', category: 'spray_window_closed', severity: 'medium', notify: false, values: expect.objectContaining({ ok_hours: 0, closed_days: ['2026-11-20'] }) })]);
  });
  it('UNSIGNED: the same weather gives an info line only: no alert, no severity, no notification', () => {
    const o = runRules(snap({ weather, sprayParams, ruleStatus: { 'SPRAY-WIN': 'unsigned' } })).filter((x) => x.rule_id === 'SPRAY-WIN');
    expect(o).toEqual([expect.objectContaining({ kind: 'info', category: 'spray_window_inputs', notify: false })]);
    expect(o[0].severity).toBeUndefined();
  });
  it('no weather yet (the server connection comes later): nothing is said, nothing invented', () => {
    expect(runRules(snap({ ruleStatus: { 'SPRAY-WIN': 'signed' } })).filter((x) => x.rule_id === 'SPRAY-WIN')).toEqual([]);
  });
});
