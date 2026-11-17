import { describe, expect, it } from 'vitest';
import { buildLabelUse, withSignOff, type LabelUseInput } from '../../src/labels/label-use';
import { buildHarvest, harvestGate } from '../../src/spray/harvest';
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
    expect(r.spray).toMatchObject({ job_id: 'job1', applicator_id: 'w1', dose_str: '0.025', dose_unit: 'ml/str', qty_str: '0.25', label_state: 'signed', phi_days: '7', rei_hours: '24', phi_source: 'label', phi_until: '2026-11-27T08:00:00Z', rei_until: '2026-11-21T08:00:00Z' });
    expect(r.flags).toEqual([]);
    expect(r.job).toMatchObject({ kind: 'spray', status: 'done', worker_id: 'w1' });
    expect(r.jobPlantings).toMatchObject([{ planting_id: 'pl1', job_id: 'job1', area_str_treated: '0.5' }]);
    expect(r.movement).toMatchObject({ direction: 'out', qty_str: '0.25', reason: 'spray', job_id: 'job1', lot_key: 'lot' });
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

describe('what a spray record cannot be without', () => {
  it.each([
    ['no planting', { plantingIds: [] }, 'plantings'], ['no product', { productId: '' }, 'product'], ['no applicator', { applicatorId: '' }, 'applicator'],
    ['Invalid Date', { sprayedAt: 'Invalid Date' }, 'time'], ['time with milliseconds', { sprayedAt: '2026-11-20T08:00:00.000Z' }, 'time'],
    ['dose 0', { dose: '0' }, 'dose'], ['dose 1.000', { dose: '1.000' }, 'dose'], ['dose empty', { dose: '' }, 'dose'], ['no dose unit', { doseUnit: undefined }, 'doseUnit'],
    ['unreadable quantity', { qty: 'abc' }, 'qty'], ['a lot without a quantity', { qty: '' }, 'qty'], ['unreadable water', { water: '1.000x' }, 'water'],
  ] as const)('%s is refused', (_n, over, key) => {
    const r = buildSpray(input(over as Partial<SprayInput>), ctx(), F, now, ids);
    expect(r).toMatchObject({ ok: false, errors: { [key]: true } });
  });
  it('without a lot no stock movement is made', () => expect(build(input({ lotKey: undefined, qty: '' }), ctx()).movement).toBeUndefined());
});

describe('the PHI entered by Bora is a separate amending row, and only while the PHI is unknown', () => {
  const unknownSpray = (): Row => build(input(), ctx({ label: labelRow() })).spray;
  it('adds a new row (the original stays), marked manual, with the exact end', () => {
    const o = unknownSpray();
    const e = buildWaitEntry(o, '7', '24', now, 'sp2');
    expect(e).toMatchObject({ ok: true, row: { id: 'sp2', amends_id: 'sp1', phi_days: '7', rei_hours: '24', phi_source: 'manual', phi_until: '2026-11-27T08:00:00Z', rei_until: '2026-11-21T08:00:00Z', job_id: 'job1', label_state: 'unsigned' } });
    expect('phi_days' in o).toBe(false); // the original is untouched
    if (!e.ok) throw new Error('setup');
    expect(effectiveSprays([o, e.row]).map((r) => r.id)).toEqual(['sp2']);
  });
  it('refuses unreadable or missing values, and refuses once a PHI is known (it could only shorten it)', () => {
    const o = unknownSpray();
    for (const [p, r] of [['', '24'], ['7,5', '24'], ['NaN', '24'], ['7', ''], ['7', 'abc']]) expect(buildWaitEntry(o, p, r, now, 'x'), `${p}|${r}`).toMatchObject({ ok: false });
    const known = build(input(), ctx()).spray;
    expect(buildWaitEntry(known, '3', '24', now, 'x')).toMatchObject({ ok: false, known: true });
  });
});

describe('harvest gate: only a KNOWN waiting period that has run out unblocks; no override', () => {
  const links: Row[] = [{ id: 'jp1', farm_id: F, job_id: 'job1', planting_id: 'pl1' }, { id: 'jp2', farm_id: F, job_id: 'job2', planting_id: 'pl2' }];
  const signedSpray = (): Row => build(input(), ctx()).spray; // PHI 7 days from T0
  const unknownSpray = (): Row => build(input(), ctx({ label: labelRow() })).spray;
  it('no spray, nothing blocks; a running PHI blocks until the end second; strictly after it is allowed', () => {
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [])).toEqual({ ok: true });
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [signedSpray()])).toEqual({ ok: false, reason: 'running', until: '2026-11-27T08:00:00Z' });
    expect(harvestGate('pl1', '2026-11-27T08:00:00Z', links, [signedSpray()])).toMatchObject({ ok: false, reason: 'running' });
    expect(harvestGate('pl1', '2026-11-27T08:00:01Z', links, [signedSpray()])).toEqual({ ok: true });
    expect(harvestGate('pl2', '2026-11-21T00:00:00Z', links, [signedSpray()])).toEqual({ ok: true }); // another planting is not affected
  });
  it('an UNKNOWN PHI blocks, however long ago; Bora\'s entered value then unblocks it only after it has run out', () => {
    const o = unknownSpray();
    expect(harvestGate('pl1', '2030-01-01T00:00:00Z', links, [o])).toEqual({ ok: false, reason: 'unknown' });
    const e = buildWaitEntry(o, '7', '24', now, 'sp2');
    if (!e.ok) throw new Error('setup');
    expect(harvestGate('pl1', '2026-11-21T00:00:00Z', links, [o, e.row])).toMatchObject({ ok: false, reason: 'running' });
    expect(harvestGate('pl1', '2026-11-28T00:00:00Z', links, [o, e.row])).toEqual({ ok: true });
  });
  it('a «not on label» PHI and damaged values block; an unreadable time blocks', () => {
    const base = signedSpray();
    for (const bad of [{ phi_days: 'not_on_label' }, { phi_days: 'NaN' }, { phi_days: 7 }, { phi_days: undefined }]) expect(harvestGate('pl1', '2030-01-01T00:00:00Z', links, [{ ...base, ...bad }]), JSON.stringify(bad)).toEqual({ ok: false, reason: 'unknown' });
    for (const at of ['Invalid Date', 'NaN', '', '2030-01-01']) expect(harvestGate('pl1', at, links, [])).toEqual({ ok: false, reason: 'time' });
  });
  it('with two sprays the longest wait counts', () => {
    const second = { ...build(input({ sprayedAt: '2026-11-22T08:00:00Z' }), ctx()).spray, id: 'sp9', job_id: 'job1' };
    expect(harvestGate('pl1', '2026-11-28T00:00:00Z', links, [signedSpray(), second])).toEqual({ ok: false, reason: 'running', until: '2026-11-29T08:00:00Z' });
  });
  it('buildHarvest refuses while blocked and keeps the typed crate count; crates must be a whole number above 0', () => {
    const sp = [signedSpray()];
    const base = { plantingId: 'pl1', crates: '12', harvestedAt: '2026-11-21T00:00:00Z', note: '' };
    expect(buildHarvest(base, links, sp, F, now, 'h1')).toMatchObject({ ok: false, gate: { reason: 'running' } });
    expect(buildHarvest({ ...base, harvestedAt: '2026-11-28T00:00:00Z' }, links, sp, F, now, 'h1')).toMatchObject({ ok: true, row: { planting_id: 'pl1', crates_str: '12', harvested_at: '2026-11-28T00:00:00Z' } });
    for (const bad of ['', '0', '1,5', 'abc', '-2']) expect(buildHarvest({ ...base, crates: bad, harvestedAt: '2026-11-28T00:00:00Z' }, links, sp, F, now, 'h'), bad).toMatchObject({ ok: false, crates: true });
    expect(buildHarvest({ ...base, plantingId: '' }, links, sp, F, now, 'h')).toMatchObject({ ok: false, planting: true });
  });
});
