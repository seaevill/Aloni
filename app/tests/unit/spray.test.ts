import { describe, expect, it } from 'vitest';
import { buildLabelUse, withSignOff, type LabelUseInput } from '../../src/labels/label-use';
import { buildHarvest, cutFromParcel, doneBlocked, harvestGate, reiLockJob, reiLockParcel } from '../../src/spray/harvest';
import { buildSpray, buildWaitEntry, effectiveSprays, type SprayContext, type SprayInput } from '../../src/spray/spray';
import type { Row } from '../../src/db/schema';

const F = 'farm';
const now = '2026-11-20T10:00:00.000Z';
const T0 = '2026-11-20T08:00:00Z';
const field = (text: string) => ({ notOnLabel: false, text });
const luInput = (over: Partial<LabelUseInput> = {}): LabelUseInput => ({ productId: 'prod', cropId: 'crop', target: '', source: '', kind: 'single', unit: 'ml/str', doseMin: field('0,025'), doseMax: field(''), phi: field('7'), rei: field('24'), maxApps: field('3'), ...over });
const labelRow = (over: Partial<LabelUseInput> = {}): Row => { const r = buildLabelUse(luInput(over), F, now, 'lu'); if (!r.ok) throw new Error('setup'); return r.row; };
const signedLabel = (): Row => withSignOff(labelRow(), 'Agronomist', '2026-11-17', now)!;
const planting = (id = 'pl1'): Row => ({ id, farm_id: F, crop_id: 'crop', parcel_id: 'p', area_str: '0.5' });
const lot: Row = { id: 'lot', lot_key: 'lot', farm_id: F, product_id: 'prod', expiry: '2028-03-31' };
const input = (over: Partial<SprayInput> = {}): SprayInput => ({ plantingIds: ['pl1'], productId: 'prod', applicatorId: 'w1', sprayedAt: T0, dose: '0,025', doseUnit: 'ml/str', lotKey: 'lot', qty: '0,25', water: '', note: '', ...over });
const ctx = (over: Partial<SprayContext> = {}): SprayContext => ({ label: signedLabel(), plantings: [planting()], lot, lotBalance: '4.5', today: '2026-11-20', ...over });
const ids = { job: 'job1', spray: 'sp1', movement: 'mv1', plantingLinks: ['jp1', 'jp2'] };
const build = (i: SprayInput, c: SprayContext) => { const r = buildSpray(i, c, F, now, ids); if (!r.ok) throw new Error(`refused ${JSON.stringify(r.errors)}`); return r; };

describe('a spray with a SIGNED label', () => {
  it('records the applicator, the typed values exactly, the PHI/REI from the signed label, and ONE stock movement', () => {
    const r = build(input(), ctx());
    expect(r.spray).toEqual({ id: 'sp1', farm_id: 'farm', job_id: 'job1', product_id: 'prod', label_use_id: 'lu', lot_key: 'lot', applicator_id: 'w1', sprayed_at: '2026-11-20T08:00:00Z', created_at: '2026-11-20T10:00:00.000Z', dose_str: '0.025', dose_unit: 'ml/str', qty_str: '0.25', label_state: 'signed', phi_days: '7', rei_hours: '24', phi_source: 'label', phi_until: '2026-11-27T08:00:00Z', rei_until: '2026-11-21T08:00:00Z', flags: [] });
    expect(r.flags).toEqual([]);
    expect(r.job).toEqual({ id: 'job1', farm_id: 'farm', kind: 'spray', status: 'done', worker_id: 'w1', product_id: 'prod', label_use_id: 'lu', done_at: '2026-11-20T08:00:00Z', created_at: '2026-11-20T10:00:00.000Z', updated_at: '2026-11-20T10:00:00.000Z', deleted_at: null });
    expect(r.jobPlantings).toEqual([{ id: 'jp1', farm_id: 'farm', planting_id: 'pl1', job_id: 'job1', area_str_treated: '0.5', created_at: '2026-11-20T10:00:00.000Z' }]);
    expect(r.movement).toEqual({ id: 'mv1', farm_id: 'farm', product_id: 'prod', direction: 'out', qty_str: '0.25', reason: 'spray', job_id: 'job1', lot_key: 'lot', created_at: '2026-11-20T10:00:00.000Z' });
  });
  it('nothing is rounded or converted: 0,250 stays 0.250', () => {
    expect(build(input({ qty: '0,250' }), ctx()).spray.qty_str).toBe('0.250');
  });
});

describe('a spray is RECORDED even with a weak label, marked, with the PHI unknown', () => {
  it.each([
    ['unsigned', () => labelRow(), 'label_unsigned', 'unsigned'],
    ['incomplete', () => labelRow({ phi: field('') }), 'label_blocked', 'blocked'],
    ['«not on label» PHI', () => labelRow({ phi: { notOnLabel: true, text: '' } }), 'label_blocked', 'blocked'],
    ['changed after the signature', () => ({ ...signedLabel(), phi_days: '3' }), 'label_changed', 'changed'],
  ])('%s label', (_n, label, flag, state) => {
    const r = build(input(), ctx({ label: label() }));
    expect(r.flags).toContain(flag);
    expect(r.spray.label_state).toBe(state);
    for (const k of ['phi_days', 'rei_hours', 'phi_until', 'rei_until', 'phi_source']) expect(k in r.spray, k).toBe(false); // unknown, never defaulted
  });
  it('no label use for the product on that crop → recorded, marked «none», PHI unknown', () => {
    expect(build(input(), ctx({ label: undefined })).flags).toContain('label_none');
    expect(build(input(), ctx({ label: { ...signedLabel(), crop_id: 'other' } })).flags).toContain('label_none');
    expect(build(input({ productId: 'prod-2' }), ctx()).flags).toContain('label_none');
  });
  it('dose against the label: outside the range or another unit is flagged, inside is not', () => {
    const range = withSignOff(labelRow({ kind: 'range', doseMin: field('0,02'), doseMax: field('0,03') }), 'A', '2026-11-17', now)!;
    expect(build(input({ dose: '0,025' }), ctx({ label: range })).flags).toEqual([]);
    expect(build(input({ dose: '0,031' }), ctx({ label: range })).flags).toEqual(['dose_outside_label']);
    expect(build(input({ dose: '0,019' }), ctx({ label: range })).flags).toEqual(['dose_outside_label']);
    expect(build(input({ doseUnit: 'g/str' }), ctx({ label: range })).flags).toEqual(['dose_unit_differs']);
  });
  it('an expired lot and a negative stock are flagged (the spray still happened)', () => {
    expect(build(input(), ctx({ lot: { ...lot, expiry: '2026-01-01' } })).flags).toContain('lot_expired');
    expect(build(input(), ctx({ lot: { ...lot, expiry: 'Invalid Date' } })).flags).toContain('lot_expired');
    expect(build(input({ qty: '5' }), ctx({ lotBalance: '4.5' })).flags).toContain('stock_negative');
    expect(build(input({ qty: '4,5' }), ctx({ lotBalance: '4.5' })).flags).not.toContain('stock_negative');
    expect(build(input(), ctx({ lotBalance: undefined })).flags).toContain('stock_negative');
  });
});

describe('a LATE entry (the end of the spraying is more than 7 days before the record): allowed, but it needs a reason and is marked; the waiting periods do not change', () => {
  const noError = { applicator: false, dose: false, doseUnit: false, plantings: false, product: false, qty: false, time: false, water: false, lateReason: false };
  it.each([['exactly 7 days before the record', '2026-11-13T10:00:00Z'], ['earlier today', '2026-11-20T01:00:00Z']])('%s: no reason needed, no mark', (_n, at) => {
    const r = build(input({ sprayedAt: at }), ctx());
    expect(r.flags).toEqual([]);
    expect(r.spray.late_reason).toBeUndefined();
  });
  it.each([['one second more than 7 days', '2026-11-13T09:59:59Z'], ['a month back', '2026-10-20T08:00:00Z']])('%s: without a reason it is refused', (_n, at) => {
    for (const lateReason of [undefined, '', '   ']) expect(buildSpray(input({ sprayedAt: at, lateReason }), ctx(), F, now, ids)).toEqual({ ok: false, errors: { ...noError, lateReason: true } });
  });
  it('with a reason it is recorded, flagged «late_entry», the reason kept as typed, and the PHI/REI counted from the ENTERED end time', () => {
    const r = build(input({ sprayedAt: '2026-11-01T08:00:00Z', lateReason: '  Ξέχασα να το γράψω  ' }), ctx());
    expect(r.flags).toEqual(['late_entry']);
    expect(r.spray).toEqual(expect.objectContaining({ sprayed_at: '2026-11-01T08:00:00Z', late_reason: 'Ξέχασα να το γράψω', flags: ['late_entry'], phi_until: '2026-11-08T08:00:00Z', rei_until: '2026-11-02T08:00:00Z' }));
  });
  it('only the Demo seed may write history without a reason (the flag is explicit)', () => {
    const r = buildSpray(input({ sprayedAt: '2026-10-20T08:00:00Z' }), ctx({ historic: true }), F, now, ids);
    expect(r.ok).toBe(true);
  });
  it('the harvest gate and «Κοπή από» carry the mark of a late entry', () => {
    const late = build(input({ sprayedAt: '2026-11-18T08:00:00Z', lateReason: 'x' }), ctx({ historic: true })).spray; // not late here (2 days): use a stored late row
    const row: Row = { ...late, flags: ['late_entry'], late_reason: 'x', job_id: 'job1', id: 'late1' };
    const pls: Row[] = [{ id: 'pl1', farm_id: F, parcel_id: 'P', crop_id: 'crop' }];
    const lk: Row[] = [{ id: 'jp1', farm_id: F, job_id: 'job1', planting_id: 'pl1' }];
    expect(harvestGate('pl1', '2026-11-19T00:00:00Z', lk, [row])).toEqual({ ok: false, reason: 'running', until: '2026-11-25T08:00:00Z', source: 'label', late: true });
    expect(cutFromParcel('P', '2026-11-19T00:00:00Z', pls, lk, [row])).toEqual({ state: 'from', at: '2026-11-25T08:00:00Z', source: 'label', late: true });
    expect(harvestGate('pl1', '2026-11-19T00:00:00Z', lk, [{ ...row, flags: [] }])).toEqual({ ok: false, reason: 'running', until: '2026-11-25T08:00:00Z', source: 'label' });
  });
});

describe('what a spray record cannot be without', () => {
  it.each([
    ['no planting', { plantingIds: [] }, 'plantings'], ['no product', { productId: '' }, 'product'], ['no applicator', { applicatorId: '' }, 'applicator'],
    ['Invalid Date', { sprayedAt: 'Invalid Date' }, 'time'], ['time with milliseconds', { sprayedAt: '2026-11-20T08:00:00.000Z' }, 'time'],
    ['dose 0', { dose: '0' }, 'dose'], ['dose 1.000', { dose: '1.000' }, 'dose'], ['dose empty', { dose: '' }, 'dose'], ['no dose unit', { doseUnit: undefined }, 'doseUnit'],
    ['unreadable quantity', { qty: 'abc' }, 'qty'], ['a lot without a quantity', { qty: '' }, 'qty'], ['unreadable water', { water: '1.000x' }, 'water'],
  ] as const)('%s is refused', (_n, over, key) => {
    const r = buildSpray(input(over as Partial<SprayInput>), ctx(), F, now, ids);
    expect(r).toEqual({ ok: false, errors: { applicator: false, dose: false, doseUnit: false, plantings: false, product: false, qty: false, time: false, water: false, lateReason: false, [key]: true } });
  });
  it('without a lot no stock movement is made', () => expect(build(input({ lotKey: undefined, qty: '' }), ctx()).movement).toBeUndefined());
});

describe('the PHI entered by Bora is a separate amending row, and only while the PHI is unknown', () => {
  const unknownSpray = (): Row => build(input(), ctx({ label: labelRow() })).spray;
  it('adds a new row (the original stays), marked manual, with the exact end', () => {
    const o = unknownSpray();
    const e = buildWaitEntry(o, '7', '24', now, 'sp2');
    expect(e).toEqual({ ok: true, row: { id: 'sp2', farm_id: 'farm', amends_id: 'sp1', job_id: 'job1', product_id: 'prod', label_use_id: 'lu', lot_key: 'lot', applicator_id: 'w1', sprayed_at: '2026-11-20T08:00:00Z', created_at: '2026-11-20T10:00:00.000Z', dose_str: '0.025', dose_unit: 'ml/str', qty_str: '0.25', label_state: 'unsigned', phi_days: '7', rei_hours: '24', phi_source: 'manual', phi_until: '2026-11-27T08:00:00Z', rei_until: '2026-11-21T08:00:00Z', flags: ['label_unsigned'] } });
    expect('phi_days' in o).toBe(false); // the original is untouched
    if (!e.ok) throw new Error('setup');
    expect(effectiveSprays([o, e.row]).map((r) => r.id)).toEqual(['sp2']);
  });
  it('refuses unreadable or missing values, and refuses once a PHI is known (it could only shorten it)', () => {
    const o = unknownSpray();
    for (const [p, r] of [['', '24'], ['7,5', '24'], ['NaN', '24'], ['7', ''], ['7', 'abc']]) expect(buildWaitEntry(o, p, r, now, 'x'), `${p}|${r}`).toEqual({ ok: false, phi: p !== '7', rei: r !== '24', known: false });
    const known = build(input(), ctx()).spray;
    expect(buildWaitEntry(known, '3', '24', now, 'x')).toEqual({ ok: false, phi: false, rei: false, known: true });
  });
});

describe('harvest gate: only a KNOWN waiting period that has run out unblocks; no override', () => {
  const links: Row[] = [{ id: 'jp1', farm_id: F, job_id: 'job1', planting_id: 'pl1' }, { id: 'jp2', farm_id: F, job_id: 'job2', planting_id: 'pl2' }];
  const signedSpray = (): Row => build(input(), ctx()).spray; // PHI 7 days from T0
  const unknownSpray = (): Row => build(input(), ctx({ label: labelRow() })).spray;
  it('no spray, nothing blocks; a running PHI blocks until the end second; strictly after it is allowed', () => {
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [])).toEqual({ ok: true });
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [signedSpray()])).toEqual({ ok: false, reason: 'running', until: '2026-11-27T08:00:00Z', source: 'label' });
    expect(harvestGate('pl1', '2026-11-27T08:00:00Z', links, [signedSpray()])).toEqual({ ok: false, reason: 'running', until: '2026-11-27T08:00:00Z', source: 'label' });
    expect(harvestGate('pl1', '2026-11-27T08:00:01Z', links, [signedSpray()])).toEqual({ ok: true });
    expect(harvestGate('pl2', '2026-11-21T00:00:00Z', links, [signedSpray()])).toEqual({ ok: true }); // another planting is not affected
  });
  it('an UNKNOWN PHI blocks, however long ago; Bora\'s entered value then unblocks it only after it has run out', () => {
    const o = unknownSpray();
    expect(harvestGate('pl1', '2030-01-01T00:00:00Z', links, [o])).toEqual({ ok: false, reason: 'unknown' });
    const e = buildWaitEntry(o, '7', '24', now, 'sp2');
    if (!e.ok) throw new Error('setup');
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [o, e.row])).toEqual({ ok: false, reason: 'running', until: '2026-11-27T08:00:00Z', source: 'manual' });
    expect(harvestGate('pl1', '2026-11-28T00:00:00Z', links, [o, e.row])).toEqual({ ok: true });
  });
  it('a «not on label» PHI and damaged values block; an unreadable time blocks', () => {
    const base = signedSpray();
    for (const bad of [{ phi_days: 'not_on_label' }, { phi_days: 'NaN' }, { phi_days: 7 }, { phi_days: undefined }]) expect(harvestGate('pl1', '2030-01-01T00:00:00Z', links, [{ ...base, ...bad }]), JSON.stringify(bad)).toEqual({ ok: false, reason: 'unknown' });
    for (const at of ['Invalid Date', 'NaN', '', '2030-01-01']) expect(harvestGate('pl1', at, links, [])).toEqual({ ok: false, reason: 'time' });
  });
  it('with two sprays the longest wait counts', () => {
    const second = { ...build(input({ sprayedAt: '2026-11-22T08:00:00Z' }), ctx()).spray, id: 'sp9', job_id: 'job1' };
    expect(harvestGate('pl1', '2026-11-28T00:00:00Z', links, [signedSpray(), second])).toEqual({ ok: false, reason: 'running', until: '2026-11-29T08:00:00Z', source: 'label' });
  });
  it('buildHarvest refuses while blocked and keeps the typed crate count; crates must be a whole number above 0', () => {
    const sp = [signedSpray()];
    const base = { plantingId: 'pl1', crates: '12', harvestedAt: '2026-11-21T00:00:00Z', note: '' };
    expect(buildHarvest(base, links, sp, F, now, 'h1')).toEqual({ ok: false, planting: false, time: true, crates: false, gate: { ok: false, reason: 'running', until: '2026-11-27T08:00:00Z', source: 'label' } });
    // the gate looks at NOW, never at the typed harvest time: a future time cannot be used to step over the PHI
    const future = buildHarvest({ ...base, harvestedAt: '2026-11-28T00:00:00Z' }, links, sp, F, now, 'h1');
    expect(future).toEqual({ ok: false, planting: false, crates: false, time: true, gate: { ok: false, reason: 'running', until: '2026-11-27T08:00:00Z', source: 'label' } });
    const later = '2026-11-28T00:00:00.000Z';
    expect(buildHarvest({ ...base, harvestedAt: '2026-11-28T00:00:00Z' }, links, sp, F, later, 'h1')).toEqual({ ok: true, row: { id: 'h1', farm_id: 'farm', planting_id: 'pl1', crates_str: '12', harvested_at: '2026-11-28T00:00:00Z', created_at: later } });
    expect(buildHarvest({ ...base, harvestedAt: '2026-11-21T00:00:00Z' }, links, sp, F, later, 'h1')).toEqual({ ok: true, row: { id: 'h1', farm_id: 'farm', planting_id: 'pl1', crates_str: '12', harvested_at: '2026-11-21T00:00:00Z', created_at: later } }); // a past time, PHI over now: recorded
    expect(buildHarvest({ ...base, harvestedAt: 'Invalid Date' }, links, sp, F, later, 'h1')).toEqual({ ok: false, planting: false, crates: false, time: true, gate: undefined });
    expect(buildHarvest(base, links, sp, F, 'Invalid Date', 'h1')).toEqual({ ok: false, planting: false, crates: false, time: false, gate: { ok: false, reason: 'time' } }); // an unreadable «now» blocks
    for (const bad of ['', '0', '1,5', 'abc', '-2']) expect(buildHarvest({ ...base, crates: bad, harvestedAt: '2026-11-28T00:00:00Z' }, links, sp, F, later, 'h'), bad).toEqual({ ok: false, planting: false, time: false, crates: true, gate: undefined });
    expect(buildHarvest({ ...base, plantingId: '' }, links, sp, F, later, 'h')).toEqual({ ok: false, planting: true, time: false, crates: false, gate: undefined });
  });
});

describe('«κοπή από»: per field, only from stored label values', () => {
  const plantings: Row[] = [{ id: 'pl1', farm_id: F, parcel_id: 'P', crop_id: 'crop' }, { id: 'pl2', farm_id: F, parcel_id: 'P', crop_id: 'crop' }, { id: 'pl3', farm_id: F, parcel_id: 'Q', crop_id: 'crop' }];
  const links: Row[] = [{ id: 'a', farm_id: F, job_id: 'job1', planting_id: 'pl1' }, { id: 'b', farm_id: F, job_id: 'job2', planting_id: 'pl2' }];
  const signed = (job: string, at: string): Row => ({ ...build(input({ sprayedAt: at }), ctx()).spray, job_id: job, id: `sp-${job}` });
  const unknown = (job: string): Row => ({ ...build(input(), ctx({ label: labelRow() })).spray, job_id: job, id: `sp-${job}` });
  it('free when nothing was sprayed or everything has run out; the latest end when running', () => {
    expect(cutFromParcel('P', '2026-11-21T00:00:00Z', plantings, links, [])).toEqual({ state: 'free' });
    expect(cutFromParcel('P', '2026-12-30T00:00:00Z', plantings, links, [signed('job1', T0)])).toEqual({ state: 'free' });
    expect(cutFromParcel('P', '2026-11-21T00:00:00Z', plantings, links, [signed('job1', T0), signed('job2', '2026-11-22T08:00:00Z')])).toEqual({ state: 'from', at: '2026-11-29T08:00:00Z', source: 'label' });
    expect(cutFromParcel('Q', '2026-11-21T00:00:00Z', plantings, links, [signed('job1', T0)])).toEqual({ state: 'free' }); // another field
  });
  it('ONE unknown waiting period makes the whole field «unknown» (blocked), even if another planting has a date', () => {
    expect(cutFromParcel('P', '2026-11-21T00:00:00Z', plantings, links, [signed('job1', T0), unknown('job2')])).toEqual({ state: 'unknown' });
    expect(cutFromParcel('P', '2030-01-01T00:00:00Z', plantings, links, [unknown('job1')])).toEqual({ state: 'unknown' });
    expect(cutFromParcel('P', 'Invalid Date', plantings, links, [])).toEqual({ state: 'unknown' }); // an unreadable «now» is never «free»
  });
});

describe('the source of a date, and the re-entry lock for workers', () => {
  const pls: Row[] = [{ id: 'pl1', farm_id: F, parcel_id: 'P', crop_id: 'crop' }, { id: 'pl3', farm_id: F, parcel_id: 'Q', crop_id: 'crop' }];
  const links: Row[] = [{ id: 'a', farm_id: F, job_id: 'job1', planting_id: 'pl1' }];
  const label = (): Row => ({ ...build(input(), ctx()).spray, job_id: 'job1', id: 'sp-a' }); // PHI 7 d, REI 24 h from T0
  it('the date names where it came from: the signed label, or the owner\'s own entry from the label', () => {
    expect(cutFromParcel('P', '2026-11-21T00:00:00Z', pls, links, [label()])).toEqual({ state: 'from', at: '2026-11-27T08:00:00Z', source: 'label' });
    const unknownRow: Row = { ...build(input(), ctx({ label: labelRow() })).spray, job_id: 'job1', id: 'sp-u' };
    const e = buildWaitEntry(unknownRow, '7', '24', now, 'sp-m');
    if (!e.ok) throw new Error('setup');
    expect(cutFromParcel('P', '2026-11-21T00:00:00Z', pls, links, [unknownRow, e.row])).toEqual({ state: 'from', at: '2026-11-27T08:00:00Z', source: 'manual' });
  });
  it('REI lock: running until the end + REI hours (strictly after it is free); unknown REI is flagged; another field is free', () => {
    expect(reiLockParcel('P', '2026-11-21T08:00:00Z', pls, links, [label()])).toEqual({ state: 'running', until: '2026-11-21T08:00:00Z' });
    expect(reiLockParcel('P', '2026-11-21T08:00:01Z', pls, links, [label()])).toEqual({ state: 'none' });
    expect(reiLockParcel('Q', '2026-11-20T09:00:00Z', pls, links, [label()])).toEqual({ state: 'none' });
    const unknownRow: Row = { ...build(input(), ctx({ label: labelRow() })).spray, job_id: 'job1', id: 'sp-u' };
    expect(reiLockParcel('P', '2030-01-01T00:00:00Z', pls, links, [unknownRow])).toEqual({ state: 'unknown' });
    expect(reiLockParcel('P', 'Invalid Date', pls, links, [])).toEqual({ state: 'unknown' }); // an unreadable «now» is never «free»
  });
  it('a job on SEVERAL fields is locked by ANY of them, not only the first; an unknown REI also keeps «Έγινε» closed; no field at all is unknown', () => {
    const at = '2026-11-21T08:00:00Z'; // P runs until exactly this second, Q is free
    expect(reiLockJob(['Q', 'P'], at, pls, links, [label()])).toEqual({ state: 'running', until: at });
    expect(reiLockJob(['P', 'Q'], at, pls, links, [label()])).toEqual({ state: 'running', until: at });
    expect(reiLockJob(['Q'], at, pls, links, [label()])).toEqual({ state: 'none' });
    const unknownRow: Row = { ...build(input(), ctx({ label: labelRow() })).spray, job_id: 'job1', id: 'sp-u' };
    expect(reiLockJob(['Q', 'P'], '2030-01-01T00:00:00Z', pls, links, [unknownRow])).toEqual({ state: 'unknown' });
    expect(reiLockJob([], at, pls, links, [])).toEqual({ state: 'unknown' });
    expect(doneBlocked({ state: 'none' })).toBe(false);
    expect(doneBlocked({ state: 'running', until: at })).toBe(true);
    expect(doneBlocked({ state: 'unknown' })).toBe(true);
  });
});
