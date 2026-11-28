import { describe, expect, it } from 'vitest';
import { fingerprint, known, makeDose, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, parseInstant, requireSignOff, runRules, type LabelUse, type Output, type Snapshot, type UseFact } from './index';

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

/** A full output with the engine's empty defaults, so a test states EVERY field it expects (nothing extra can slip through). */
const full = (o: Partial<Output>): Output => ({ rule_id: '', kind: 'info', category: '', notify: false, parcel_ids: [], planting_ids: [], product_ids: [], crop_ids: [], values: {}, vetoes: [], ...o });
const PHI_BLOCK: Partial<Output> = { rule_id: 'PHI', kind: 'alert', category: 'phi_blocked_unknown', severity: 'high', planting_ids: ['pl'], parcel_ids: ['p'], product_ids: ['prod'] };

describe('a running PHI is a harvest veto, and the frost thaw advice never says «PHI clear» during one', () => {
  const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: '2026-11-18T09:00:00Z' }];
  it('the running hold carries the same harvest veto as the blocked case (a hold is never an advice without a veto)', () => {
    const hold = runRules(snap({ jobs: j, asOf: '2026-11-20T00:00:00Z' })).find((o) => o.category === 'phi_hold');
    expect(hold?.vetoes).toEqual([{ by: 'PHI', vetoed: 'harvest', planting_id: 'pl', reason: 'phi_running' }]);
  });
  it('escape attempt: once the hold is over there is no veto, and one second before the end there still is', () => {
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T09:00:00Z' })).find((o) => o.category === 'phi_hold')?.vetoes).toHaveLength(1);
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T09:00:01Z' })).flatMap((o) => o.vetoes.filter((v) => v.by === 'PHI'))).toEqual([]);
  });
  it('FROST thaw: a planting under a running PHI gets no «no harvest before thaw» advice and no phi_clear:true anywhere', () => {
    const frostParams = { tminMaxC: 2, windMaxKmh: 5, cloudMaxOktas: 2, elevationMaxM: 500, offsetC: { plain: -1, slope: 2, coastal: 1 }, leafBelowAirC: [1, 3] as const, coverGainC: [1, 2] as const };
    const frost = (): Snapshot => snap({ asOf: '2026-11-20T04:40:00Z', ruleStatus: { FROST: 'signed' }, jobs: j.map((x) => ({ ...x, startedAt: '2026-11-19T06:00:00Z', endedAt: '2026-11-19T08:00:00Z' })),
      frost: { params: frostParams, parcels: { p: { elevationM: 24, topo: 'plain', nights: [{ night: '2026-11-20/2026-11-21', from: '2026-11-20', to: '2026-11-21', tminC: 1, windKmh: 2, cloudOktas: 1 }] } }, tenderCrops: [], guardCrops: ['crop'], coversOnHand: false,
        thaw: { firstLocalHour: 6, minLeafTempC: 0, harvestFromByPlanting: { pl: '2026-11-18' }, hoursByParcel: { p: [{ at: '2026-11-21T07:00:00Z', localDay: '2026-11-21', localHour: 9, tempC: 6 }] } } } });
    const out = runRules(frost());
    expect(out.some((o) => o.category === 'phi_hold')).toBe(true);
    expect(out.filter((o) => o.category === 'no_harvest_before_thaw')).toEqual([]);
    expect(out.some((o) => o.values.phi_clear === true)).toBe(false);
    // control: with no spray at all the advice is still given, and only then it says phi_clear
    const clear = runRules({ ...frost(), jobs: [] }).find((o) => o.category === 'no_harvest_before_thaw');
    expect(clear?.values.phi_clear).toBe(true);
  });
});

describe('several label rows for one (product, crop): every row is read, the longest wait counts, any unsigned row blocks', () => {
  const sprayed = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-10T06:00:00Z', endedAt: '2026-11-10T08:00:00Z' }];
  it('PHI: a short signed row listed FIRST does not hide a longer one (hold to the latest end), in either order', () => {
    for (const uses of [[use('3', '24', true), use('14', '48', true)], [use('14', '48', true), use('3', '24', true)]]) {
      const out = runRules(snap({ jobs: sprayed, uses, asOf: '2026-11-20T00:00:00Z' })).filter((o) => o.rule_id === 'PHI');
      expect(out.map((o) => [o.category, o.values.safe_from, o.values.phi_days])).toEqual([['phi_hold', '2026-11-24T08:00:00Z', 14]]);
      expect(out[0].vetoes).toEqual([{ by: 'PHI', vetoed: 'harvest', planting_id: 'pl', reason: 'phi_running' }]);
    }
  });
  it('escape attempt: the hold stays on one second before the longest end and is gone after it (the short row never frees it)', () => {
    const uses = [use('3', '24', true), use('14', '48', true)];
    expect(runRules(snap({ jobs: sprayed, uses, asOf: '2026-11-24T08:00:00Z' })).some((o) => o.category === 'phi_hold')).toBe(true);
    expect(runRules(snap({ jobs: sprayed, uses, asOf: '2026-11-24T08:00:01Z' })).some((o) => o.category === 'phi_hold')).toBe(false);
  });
  it('PHI: ONE unsigned row among signed ones blocks (not_signed), whatever its position; the REG alert is only for «no row at all»', () => {
    for (const uses of [[use('3', '24', true), use('14', '48', false)], [use('14', '48', false), use('3', '24', true)]]) {
      const out = runRules(snap({ jobs: sprayed, uses, asOf: '2026-11-20T00:00:00Z' }));
      expect(out.filter((o) => o.rule_id === 'PHI').map((o) => [o.category, o.values.reason, o.values.safe_from])).toEqual([['phi_blocked_unknown', 'not_signed', null]]);
      expect(out.some((o) => o.rule_id === 'REG')).toBe(false);
    }
  });
  it('REI: the LONGEST re-entry counts, and an unsigned row among signed ones makes it unknown', () => {
    const jobs = [{ ...sprayed[0], startedAt: '2026-11-19T06:00:00Z', endedAt: '2026-11-19T08:00:00Z' }];
    const rei = runRules(snap({ jobs, uses: [use('3', '24', true), use('3', '72', true)], asOf: '2026-11-20T09:00:00Z' })).filter((o) => o.rule_id === 'REI');
    expect(rei.map((o) => [o.category, o.values.reentry_at, o.values.rei_h])).toEqual([['rei', '2026-11-22T08:00:00Z', 72]]);
    const bad = runRules(snap({ jobs, uses: [use('3', '72', false), use('3', '24', true)], asOf: '2026-11-20T09:00:00Z' })).filter((o) => o.rule_id === 'REI');
    expect(bad.map((o) => [o.category, o.values.reason])).toEqual([['rei_unknown', 'not_signed']]);
  });
  it('REG: a draft spray is «on the label» only when EVERY row for the pair is signed', () => {
    const draftJobs = [{ id: 'd', kind: 'spray', plantingIds: ['pl'], productId: 'prod' }];
    expect(runRules(snap({ draftJobs, uses: [use('3', '24', true), use('14', '48', true)] })).some((o) => o.category === 'exclude_unregistered_beds')).toBe(false);
    expect(runRules(snap({ draftJobs, uses: [use('3', '24', true), use('14', '48', false)] })).some((o) => o.category === 'exclude_unregistered_beds')).toBe(true);
  });
  it('PHI and REI: a spray that ENDS BEFORE it starts is «unreadable time» (blocked), never counted from the earlier time', () => {
    const jobs = [{ ...sprayed[0], startedAt: '2026-11-19T10:00:00Z', endedAt: '2026-11-19T06:00:00Z' }];
    const out = runRules(snap({ jobs, uses: [use('7', '24', true)], asOf: '2026-11-26T07:00:00Z' }));
    expect(out.filter((o) => o.rule_id === 'PHI').map((o) => [o.category, o.values.reason, o.values.safe_from])).toEqual([['phi_blocked_unknown', 'unreadable_time', null]]);
    expect(out.filter((o) => o.rule_id === 'REI').map((o) => [o.category, o.values.reason])).toEqual([['rei_unknown', 'unreadable_time']]);
    const equal = [{ ...sprayed[0], startedAt: '2026-11-19T08:00:00Z', endedAt: '2026-11-19T08:00:00Z' }]; // same instant is fine
    expect(runRules(snap({ jobs: equal, uses: [use('7', '24', true)], asOf: '2026-11-20T00:00:00Z' })).filter((o) => o.rule_id === 'PHI').map((o) => o.category)).toEqual(['phi_hold']);
  });
});

describe('the engine never shortens a waiting period and never decides from what is not signed', () => {
  it('property (1000 sprays): the PHI hold ends exactly PHI × 24 h after the spray, is on while it runs and gone after it, and no date is earlier', () => {
    const rnd = seeded(31);
    for (let i = 0; i < 1000; i += 1) {
      const start = at(2026, 1 + (rnd() % 12), 1 + (rnd() % 28), rnd() % 24, rnd() % 60, rnd() % 60);
      const phi = rnd() % 60;
      const s0 = secs(start);
      const base = snap({ jobs: [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: start, endedAt: start }], uses: [use(String(phi), '24', true)] });
      const out = runRules({ ...base, asOf: start }).filter((o) => o.rule_id === 'PHI');
      expect(out, start).toHaveLength(1);
      expect(secs(String(out[0].values.safe_from)) - s0, start).toBe(phi * 86400); // exact
      expect(out[0].values.safe_from).toBe(out[0].window?.end);
    }
  });
  it('after the end the hold is gone; one second before it is still on', () => {
    const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: '2026-11-18T09:00:00Z' }];
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T08:59:59Z' })).some((o) => o.category === 'phi_hold')).toBe(true);
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T09:00:00Z' })).some((o) => o.category === 'phi_hold')).toBe(true); // at the second: still on
    expect(runRules(snap({ jobs: j, asOf: '2026-11-25T09:00:01Z' })).some((o) => o.category === 'phi_hold')).toBe(false);
  });
  it('NO end time: the PHI is never counted from the start; the planting is «blocked» with no date', () => {
    const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt: undefined }];
    for (const asOf of ['2026-11-19T00:00:00Z', '2030-01-01T00:00:00Z']) {
      const o = runRules(snap({ jobs: j, asOf })).filter((x) => x.rule_id === 'PHI');
      expect(o, asOf).toHaveLength(1);
      expect(o[0]).toEqual(full({ ...PHI_BLOCK, values: { lot_status: 'blocked', safe_from: null, reason: 'no_end_time' }, vetoes: [{ by: 'PHI', vetoed: 'harvest', planting_id: 'pl', reason: 'no_end_time' }] }));
    }
  });
  it('an unreadable spray time is «blocked», never silently passed', () => {
    for (const endedAt of ['Invalid Date', '', 'NaN', '2026-11-18', '2026-11-18T09:00:00.000Z']) {
      const j = [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt }];
      const o = runRules(snap({ jobs: j, asOf: '2030-01-01T00:00:00Z' })).filter((x) => x.rule_id === 'PHI');
      expect(o.map((x) => [x.category, x.values.reason]), endedAt).toEqual([['phi_blocked_unknown', 'unreadable_time']]);
    }
  });
  it('an unsigned, incomplete or missing label gives «blocked» with NO date, never a default PHI', () => {
    for (const uses of [[use('7', '24', false)], [use('', '24', true)], [use('7', 'NaN', true)], []]) {
      const out = runRules(snap({ uses })).filter((o) => o.rule_id === 'PHI');
      expect(out, JSON.stringify(uses.length)).toHaveLength(1);
      const why = uses.length === 0 ? 'no_label_row' : 'not_signed';
      expect(out[0]).toEqual(full({ ...PHI_BLOCK, values: { lot_status: 'blocked', safe_from: null, reason: why }, vetoes: [{ by: 'PHI', vetoed: 'harvest', planting_id: 'pl', reason: why }] }));
    }
  });
  it('REI counts from the END of the spraying, never from midnight and never shorter; tasks before it are vetoed', () => {
    const out = runRules(snap({ asOf: '2026-11-18T10:00:00Z', tasks: [{ id: 'T1', plantingIds: ['pl'], at: '2026-11-19T08:00:00Z' }, { id: 'T2', plantingIds: ['pl'], at: '2026-11-19T09:30:00Z' }] })).filter((o) => o.rule_id === 'REI');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(full({ rule_id: 'REI', kind: 'alert', category: 'rei', severity: 'high', confidence: 'medium', planting_ids: ['pl'], parcel_ids: ['p'], window: { start: '2026-11-18T09:00:00Z', end: '2026-11-19T09:00:00Z' },
      values: { reentry_at: '2026-11-19T09:00:00Z', rei_h: 24, blocked_task_ids: ['T1'], allowed_task_ids: ['T2'] }, vetoes: [{ by: 'REI', vetoed: 'task', task_id: 'T1', reason: 'before_reentry' }] }));
  });
  it('a rule whose own thresholds are unsigned only SHOWS its inputs: no alert, no severity, no notification', () => {
    const out = runRules(snap({ ruleStatus: { FROST: 'unsigned' }, parcelsForInfo: ['p'] })).filter((o) => o.rule_id === 'FROST');
    expect(out).toEqual([full({ rule_id: 'FROST', kind: 'info', category: 'frost_inputs', parcel_ids: ['p'], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })]);
    expect(out[0].severity).toBeUndefined();
    expect(runRules(snap({ ruleStatus: { FROST: 'signed' }, parcelsForInfo: ['p'] })).some((o) => o.rule_id === 'FROST')).toBe(false); // not built yet: nothing invented
  });
  it('an unreadable «now» is a BLOCK, never an empty «all clear»', () => {
    for (const asOf of ['Invalid Date', '', 'NaN', '2026-11-20']) {
      const o = runRules(snap({ asOf }));
      expect(o, asOf).toHaveLength(1);
      expect(o[0]).toEqual(full({ rule_id: 'ENGINE', kind: 'block', category: 'now_unreadable', severity: 'high', vetoes: [{ by: 'ENGINE', vetoed: 'everything', reason: 'unreadable_now' }] }));
    }
  });
  it('REI: a done spray with NO end time, an unreadable time, or no signed label blocks every task on that planting (never skipped)', () => {
    const tasks = [{ id: 'T1', plantingIds: ['pl'], at: '2026-11-19T08:00:00Z' }, { id: 'T2', plantingIds: ['other'], at: '2026-11-19T08:00:00Z' }];
    const job = (endedAt: string | undefined) => [{ id: 'j', kind: 'spray', status: 'done', plantingIds: ['pl'], productId: 'prod', startedAt: '2026-11-18T08:00:00Z', endedAt }];
    for (const [endedAt, why] of [[undefined, 'no_end_time'], ['Invalid Date', 'unreadable_time']] as const) {
      const o = runRules(snap({ jobs: job(endedAt), tasks })).filter((x) => x.rule_id === 'REI');
      expect(o, why).toHaveLength(1);
      expect(o[0]).toEqual(full({ rule_id: 'REI', kind: 'alert', category: 'rei_unknown', severity: 'high', planting_ids: ['pl'], parcel_ids: ['p'], product_ids: ['prod'], values: { reentry_at: null, reason: why, blocked_task_ids: ['T1'], allowed_task_ids: ['T2'] }, vetoes: [{ by: 'REI', vetoed: 'task', task_id: 'T1', reason: 'rei_unknown' }] }));
    }
    const unsigned = runRules(snap({ jobs: job('2026-11-18T09:00:00Z'), tasks, uses: [use('7', '24', false)] })).filter((x) => x.rule_id === 'REI');
    expect(unsigned.map((x) => [x.category, x.values.reason])).toEqual([['rei_unknown', 'not_signed']]);
  });
  it('REI: a task whose time cannot be read is vetoed, never allowed', () => {
    const o = runRules(snap({ asOf: '2026-11-18T10:00:00Z', tasks: [{ id: 'T1', plantingIds: ['pl'], at: 'Invalid Date' }, { id: 'T2', plantingIds: ['pl'], at: '2026-11-19T09:30:00Z' }] })).filter((x) => x.rule_id === 'REI');
    expect(o[0].values).toEqual({ reentry_at: '2026-11-19T09:00:00Z', rei_h: 24, blocked_task_ids: ['T1'], allowed_task_ids: ['T2'] });
    expect(o[0].vetoes).toEqual([{ by: 'REI', vetoed: 'task', task_id: 'T1', reason: 'before_reentry' }]);
  });
});

describe('REG and ROT: a draft spray never covers beds that are not on a signed label, and a missing value is never «cleared»', () => {
  const two = [{ id: 'pl', parcelId: 'p', cropId: 'crop' }, { id: 'pl2', parcelId: 'p', cropId: 'other' }];
  const draft = { id: 'd', kind: 'spray', plantingIds: ['pl', 'pl2'], productId: 'prod' };
  it('only the planting whose crop is on the signed label is allowed; the others are excluded one by one', () => {
    const o = runRules(snap({ plantings: two, draftJobs: [draft], jobs: [] })).filter((x) => x.rule_id === 'REG');
    expect(o).toHaveLength(1);
    expect(o[0]).toEqual(full({ rule_id: 'REG', kind: 'block', category: 'exclude_unregistered_beds', severity: 'high', planting_ids: ['pl2'], product_ids: ['prod'], values: { job_id: 'd', allowed_planting_ids: ['pl'], exclude_planting_ids: ['pl2'] }, vetoes: [{ by: 'REG', vetoed: 'spray', planting_id: 'pl2', reason: 'not_on_label' }] }));
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
  const hours = Array.from({ length: 24 }, (_, i) => ({ time: `2026-11-20T${String(i).padStart(2, '0')}:00:00Z`, day: '2026-11-20', tempC: 8, rhPct: 94, windKmh: 30, gustKmh: 60, rainMm: 2, cloudOktas: 6, leafWet: true }));
  const weather = { hours: { p: hours }, sun: { '2026-11-20': { sunrise: '2026-11-20T05:10:00Z', sunset: '2026-11-20T15:07:00Z' } }, rainDaily: { p: { '2026-11-20': 6.5 } } };
  const sprayParams = { windMin: 3, windMax: 10, gustMax: 20, dryBeforeH: 1, rainLookaheadH: 3, rainMaxMm: 0.2, deltaTMin: 2, deltaTMax: 8, tempMax: 28, inversionAfterSunriseH: 2 };
  it('signed (for test): a day with no OK hour raises the medium «window closed» alert; it never notifies', () => {
    const o = runRules(snap({ weather, sprayParams, ruleStatus: { 'SPRAY-WIN': 'signed' } })).filter((x) => x.rule_id === 'SPRAY-WIN');
    expect(o).toEqual([full({ rule_id: 'SPRAY-WIN', kind: 'alert', category: 'spray_window_closed', severity: 'medium', confidence: 'medium', parcel_ids: ['p'], window: { start: '2026-11-20', end: '2026-11-20' }, values: { closed_days: ['2026-11-20'], ok_hours: 0, rain_mm: { '2026-11-20': 6.5 }, max_gust_kmh: { p: 60 } } })]);
  });
  it('UNSIGNED: the same weather gives an info line only: no alert, no severity, no notification', () => {
    const o = runRules(snap({ weather, sprayParams, ruleStatus: { 'SPRAY-WIN': 'unsigned' } })).filter((x) => x.rule_id === 'SPRAY-WIN');
    expect(o).toEqual([full({ rule_id: 'SPRAY-WIN', kind: 'info', category: 'spray_window_inputs', parcel_ids: ['p'], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })]);
    expect(o[0].severity).toBeUndefined();
  });
  it('thresholds that cannot be used, or hours with missing data, are NEVER reported as «window closed»: only an info line that says it is unknown', () => {
    const signed = { 'SPRAY-WIN': 'signed' } as const;
    const broken = runRules(snap({ weather, sprayParams: { ...sprayParams, windMax: NaN }, ruleStatus: signed })).filter((x) => x.rule_id === 'SPRAY-WIN');
    expect(broken.map((x) => [x.kind, x.category])).toEqual([['info', 'spray_window_unknown']]);
    const noWet = { ...weather, hours: { p: hours.map((h) => ({ ...h, leafWet: undefined })) } };
    expect(runRules(snap({ weather: noWet, sprayParams, ruleStatus: signed })).filter((x) => x.rule_id === 'SPRAY-WIN').map((x) => [x.kind, x.category])).toEqual([['info', 'spray_window_unknown']]);
  });
  it('no weather yet (the server connection comes later): nothing is said, nothing invented', () => {
    expect(runRules(snap({ ruleStatus: { 'SPRAY-WIN': 'signed' } })).filter((x) => x.rule_id === 'SPRAY-WIN')).toEqual([]);
  });
});

describe('FROST: only positively known inputs make an alert; never a damage claim', () => {
  const params = { tminMaxC: 2, windMaxKmh: 5, cloudMaxOktas: 2, elevationMaxM: 50, offsetC: { plain: 0, slope: 0, coastal: 0 }, leafBelowAirC: [1, 3] as const, coverGainC: [1, 2] as const };
  const calm = { night: '2026-11-17/2026-11-18', from: '2026-11-17', to: '2026-11-18', tminC: 1, windKmh: 3, cloudOktas: 0 as number | undefined };
  const night = (edit: (n: typeof calm) => void) => { const n = { ...calm }; edit(n); return n; };
  const frostSnap = (n: ReturnType<typeof night>, status: 'signed' | 'unsigned', elevationM: number, topo: 'plain' | undefined): Snapshot => snap({
    ruleStatus: { FROST: status }, parcelsForInfo: ['p'], jobs: [], plantings: [{ id: 'pl', parcelId: 'p', cropId: 'coriander' }],
    frost: { params, parcels: { p: { elevationM, topo, nights: [n] } }, tenderCrops: ['coriander'], guardCrops: [], coversOnHand: true },
  });
  const low = (edit: (n: typeof calm) => void, status: 'signed' | 'unsigned') => frostSnap(night(edit), status, 20, 'plain');
  const of = (s: Snapshot) => runRules(s).filter((x) => x.rule_id === 'FROST');
  it('a clear calm cold night on a low plain parcel: a high, LOW-confidence alert that claims no damage and notifies nobody', () => {
    const o = of(low(() => undefined, 'signed'));
    expect(o[0]).toEqual(full({ rule_id: 'FROST', kind: 'alert', category: 'frost_conditions', severity: 'high', confidence: 'low', parcel_ids: ['p'], planting_ids: ['pl'], window: { start: '2026-11-17', end: '2026-11-18' },
      values: { nights: [{ night: '2026-11-17/2026-11-18', p: 1 }], leaf_range_c: [{ night: '2026-11-17/2026-11-18', p: [-2, 0] }], leaf_basis: 'EST', damage_claimed: false } }));
    expect(o.map((x) => x.category)).toContain('cover');
  });
  it('UNSIGNED: only an info line, no alert, no recommendation, no severity', () => {
    const o = of(low(() => undefined, 'unsigned'));
    expect(o.map((x) => [x.kind, x.category])).toEqual([['info', 'frost_inputs']]);
  });
  it('missing cloud, NaN temperature, missing topo class or NaN elevation: no alert, and the gap is said out loud (never «no frost»)', () => {
    for (const s of [low((n) => { n.cloudOktas = undefined; }, 'signed'), low((n) => { n.tminC = NaN; }, 'signed'), low((n) => { n.windKmh = NaN; }, 'signed'), frostSnap(night(() => undefined), 'signed', 20, undefined), frostSnap(night(() => undefined), 'signed', NaN, 'plain')]) {
      const o = of(s);
      expect(o.some((x) => x.kind === 'alert')).toBe(false);
      expect(o).toEqual([full({ rule_id: 'FROST', kind: 'info', category: 'frost_inputs_missing', parcel_ids: ['p'], values: { missing: expect.any(Array), badge: 'unknown' } })]);
    }
  });
  it('every limit is inclusive and a night just outside it is quiet: 2.0 °C, 5 km/h, 2 oktas, 50 m are in; 2.1, 5.1, 3, 50.1 are out', () => {
    for (const over of [(n: typeof calm) => { n.tminC = 2; }, (n: typeof calm) => { n.windKmh = 5; }, (n: typeof calm) => { n.cloudOktas = 2; }]) expect(of(low(over, 'signed')).some((x) => x.kind === 'alert')).toBe(true);
    expect(of(frostSnap(night(() => undefined), 'signed', 50, 'plain')).some((x) => x.kind === 'alert')).toBe(true);
    for (const over of [(n: typeof calm) => { n.tminC = 2.1; }, (n: typeof calm) => { n.windKmh = 5.1; }, (n: typeof calm) => { n.cloudOktas = 3; }]) expect(of(low(over, 'signed')).some((x) => x.kind === 'alert')).toBe(false);
    expect(of(frostSnap(night(() => undefined), 'signed', 50.1, 'plain')).some((x) => x.kind === 'alert')).toBe(false);
  });
  it('the leaf surface is always a range (2 m air − 3 … − 1), never a single number', () => {
    expect(of(low(() => undefined, 'signed'))[0].values.leaf_range_c).toEqual([{ night: '2026-11-17/2026-11-18', p: [-2, 0] }]);
  });
});
