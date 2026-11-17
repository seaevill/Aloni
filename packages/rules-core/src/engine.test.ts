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
  asOf: '2026-11-20T00:00:00Z', plantings: [{ id: 'pl', parcelId: 'p', cropId: 'crop' }], uses: [use('7', '24', true)], tasks: [], ruleStatus: {}, parcelsForInfo: [],
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
