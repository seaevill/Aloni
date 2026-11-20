import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { formatDose } from '../../src/i18n/format';
import { buildLabelUse, DOSE_UNITS, NOT_ON_LABEL, readNote, readUse, statusOf, withSignOff, type Field, type LabelUseInput } from '../../src/labels/label-use';
import { put } from '../../src/repo';
import { TEST_FARM_ID, newDb } from '../helpers/factories';

const now = '2026-11-20T10:00:00.000Z';
const typed = (text: string): Field => ({ notOnLabel: false, text });
const empty = typed('');
const nol: Field = { notOnLabel: true, text: '' };
const input = (over: Partial<LabelUseInput> = {}): LabelUseInput => ({
  productId: 'prod-1', cropId: 'crop-1', target: '', source: '', kind: 'single', unit: 'ml/str',
  doseMin: typed('0,025'), doseMax: empty, phi: typed('7'), rei: typed('24'), maxApps: typed('3'), ...over,
});
const build = (i: LabelUseInput) => { const r = buildLabelUse(i, TEST_FARM_ID, now, 'lu-1'); if (!r.ok) throw new Error(`setup: ${[...r.invalid].join(',')}`); return r.row; };

describe('typed values are kept exactly', () => {
  it('«0,025» is stored as 0.025 and shown back as «0,025»; trailing zeros survive; nothing becomes a number', async () => {
    const row = build(input());
    expect(row).toEqual({ "created_at": "2026-11-20T10:00:00.000Z", "crop_id": "crop-1", "deleted_at": null, "dose_kind": "single", "dose_min": "0.025", "dose_unit": "ml/str", "farm_id": "11111111-1111-4111-8111-111111111111", "id": "lu-1", "max_apps": "3", "phi_days": "7", "product_id": "prod-1", "rei_hours": "24", "updated_at": "2026-11-20T10:00:00.000Z" });
    const dose = readUse(row).dose;
    expect(dose.known && formatDose({ known: true, value: dose.value.min })).toBe('0,025');
    expect(readUse(build(input({ doseMin: typed('0,250') }))).dose).toEqual({ known: true, value: { kind: 'single', min: '0.250', max: '0.250', unit: 'ml/str' } });
    for (const k of ['dose_min', 'phi_days', 'rei_hours', 'max_apps']) expect(typeof row[k], k).toBe('string');
    const db = await newDb();
    await put(db, 'label_uses', row, 'insert');
    expect(await db.label_uses.get('lu-1')).toEqual({ ...row, device_id: expect.any(String), actor_id: expect.any(String) }); // survives unchanged, plus who wrote it
  });
  it('single = one box (a typed second dose is NOT kept); range = both, min above max refused, equal allowed', () => {
    expect(build(input({ doseMax: typed('9') })).dose_max).toBeUndefined();
    const range = build(input({ kind: 'range', doseMin: typed('0,15'), doseMax: typed('0,25') }));
    expect(readUse(range).dose).toEqual({ "known": true, "value": { "kind": "range", "max": "0.25", "min": "0.15", "unit": "ml/str" } });
    expect(buildLabelUse(input({ kind: 'range', doseMin: typed('0,25'), doseMax: typed('0,15') }), TEST_FARM_ID, now, 'x')).toEqual({ ok: false, product: false, crop: false, invalid: new Set(['range']) });
    expect(buildLabelUse(input({ kind: 'range', doseMin: typed('0,25'), doseMax: typed('0,25') }), TEST_FARM_ID, now, 'x').ok).toBe(true);
  });
  it('a typed but unreadable value is refused, never guessed: «1.000» dose, «7,5» PHI, «abc» REI', () => {
    const r = buildLabelUse(input({ doseMin: typed('1.000'), phi: typed('7,5'), rei: typed('abc') }), TEST_FARM_ID, now, 'x');
    expect(r).toEqual({ "crop": false, "invalid": new Set(["doseMin", "phi", "rei"]), "ok": false, "product": false });
  });
  it('a product and a crop are required; the dose unit list is the provisional one (no %, no conversions)', () => {
    expect(buildLabelUse(input({ productId: '' }), TEST_FARM_ID, now, 'x')).toEqual({ "crop": false, "invalid": new Set(), "ok": false, "product": true });
    expect(buildLabelUse(input({ cropId: '' }), TEST_FARM_ID, now, 'x')).toEqual({ ok: false, product: false, crop: true, invalid: new Set() });
    expect([...DOSE_UNITS]).toEqual(['ml/str', 'g/str', 'l/str', 'kg/str', 'ml/100l', 'g/100l']);
  });
});

describe('blocked: anything missing, not on the label, or not chosen', () => {
  it('a complete label is «unsigned» (Χωρίς υπογραφή γεωπόνου), never «signed» on its own', () => expect(statusOf(build(input()))).toBe('unsigned'));
  it.each([
    ['no dose kind chosen', { kind: undefined }],
    ['no dose unit chosen', { unit: undefined }],
    ['empty dose', { doseMin: empty }],
    ['dose «δεν αναγράφεται»', { doseMin: nol }],
    ['empty PHI', { phi: empty }],
    ['PHI «δεν αναγράφεται»', { phi: nol }],
    ['empty REI', { rei: empty }],
    ['empty max applications', { maxApps: empty }],
    ['range with no second dose', { kind: 'range' as const, doseMax: empty }],
  ])('%s → blocked (the row can still be saved, it just cannot be used)', (_n, over) => {
    const row = build(input(over));
    expect(statusOf(row)).toBe('blocked');
    expect(withSignOff(row, 'Agronomist', '2026-11-17', now)).toBeUndefined(); // an incomplete label cannot be signed
  });
  it('«δεν αναγράφεται» is stored as a marker, not as a number', () => expect(build(input({ phi: nol })).phi_days).toBe(NOT_ON_LABEL));
  it('a row with damaged stored values is blocked, never «passed»', () => {
    const row = build(input());
    for (const bad of [{ phi_days: 'NaN' }, { phi_days: 7 }, { rei_hours: null }, { dose_min: '1.000' }, { max_apps: '' }, { dose_kind: 'both' }, { dose_unit: '%' }]) {
      expect(statusOf({ ...row, ...bad }), JSON.stringify(bad)).toBe('blocked');
    }
  });
});

describe('sign-off: exactly these values, a real date, a name; any edit drops it', () => {
  const signed = () => { const r = withSignOff(build(input()), '  Test Agronomist ', '2026-11-17', now); if (!r) throw new Error('setup'); return r; };
  it('records the sign-off and shows «signed»', () => {
    expect(statusOf(signed())).toBe('signed');
    expect(signed().sign_off).toEqual({ by: 'Test Agronomist', on: '2026-11-17', fingerprint: expect.stringContaining('prod-1') }); // the fingerprint covers product, crop, target and the values
  });
  it('keeps the agronomist\'s note and an optional photo WITH the approval; neither changes what the approval covers', () => {
    const plain = signed().sign_off as { fingerprint: string };
    const withExtras = withSignOff(build(input()), 'Test Agronomist', '2026-11-17', now, { note: '  seen at the shop  ', photoId: 'photo-1' });
    expect(withExtras?.sign_off).toEqual({ by: 'Test Agronomist', on: '2026-11-17', fingerprint: plain.fingerprint, note: 'seen at the shop', photo_id: 'photo-1' });
    expect(statusOf(withExtras!)).toBe('signed');                                                  // the note and the photo never decide anything
    expect(readNote(withExtras!)).toEqual({ note: 'seen at the shop', photoId: 'photo-1' });
    expect(readNote(signed())).toEqual({});                                                        // an approval without them shows nothing extra
    expect((withSignOff(build(input()), 'A', '2026-11-17', now, { note: '   ' })!.sign_off as Record<string, unknown>).note).toBeUndefined();   // an empty note is not stored
    expect(withSignOff(build(input()), 'A', '2026-11-17', now, { note: 'x'.repeat(2001) })).toBeUndefined();                                      // as long as the server ledger allows (2000)
  });
  it('no name or no real date → no sign-off', () => {
    for (const [by, on] of [['', '2026-11-17'], ['  ', '2026-11-17'], ['A', 'Invalid Date'], ['A', ''], ['A', '2026-02-31']]) expect(withSignOff(build(input()), by, on, now), `${by}|${on}`).toBeUndefined();
  });
  it('editing through the form builds a row WITHOUT the sign-off (unsigned again)', () => {
    const edited = build(input({ phi: typed('3') }));
    expect('sign_off' in edited).toBe(false);
    expect(statusOf(edited)).toBe('unsigned');
  });
  it('a value changed behind the form\'s back (PHI shortened 7 → 3, dose, REI, max applications) makes the old sign-off «changed», never «signed»', () => {
    for (const change of [{ phi_days: '3' }, { rei_hours: '12' }, { max_apps: '4' }, { dose_min: '0.5' }, { dose_unit: 'g/str' }]) {
      expect(statusOf({ ...signed(), ...change }), JSON.stringify(change)).toBe('changed');
    }
  });
});

describe('dose 0 and the scope of the approval', () => {
  it('a typed dose of 0 is refused; a stored 0 is blocked, never usable', () => {
    for (const zero of ['0', '0,0', '0,000']) expect(buildLabelUse(input({ doseMin: typed(zero) }), TEST_FARM_ID, now, 'x'), zero).toEqual({ ok: false, product: false, crop: false, invalid: new Set(['doseMin']) });
    expect(buildLabelUse(input({ kind: 'range', doseMin: typed('1'), doseMax: typed('0') }), TEST_FARM_ID, now, 'x')).toEqual({ ok: false, product: false, crop: false, invalid: new Set(['doseMax']) });
    expect(statusOf({ ...build(input()), dose_min: '0' })).toBe('blocked');
    expect(build(input({ phi: typed('0') })).phi_days).toBe('0'); // a PHI of 0 days is a real label value
  });
  it('the approval covers product, crop and target too: changing any of them leaves it «changed», never «signed»', () => {
    const row = withSignOff(build(input({ target: 'mildew' })), 'Agronomist', '2026-11-17', now)!;
    expect(statusOf(row)).toBe('signed');
    for (const change of [{ product_id: 'prod-2' }, { crop_id: 'crop-2' }, { target: 'aphids' }]) expect(statusOf({ ...row, ...change }), JSON.stringify(change)).toBe('changed');
    expect('sign_off' in build(input({ target: 'aphids' }))).toBe(false); // editing the target through the form drops it too
  });
});

import { keepLinks, safetyChanged } from '../../src/labels/label-use';
describe('label use: used / replacement rows (m4-0020)', () => {
  const base = { id: 'a', farm_id: 'f', product_id: 'p', crop_id: 'c', dose_kind: 'single', dose_unit: 'ml/str', dose_min: '0.025', phi_days: '7', rei_hours: '24', max_apps: '3' };
  it('a changed safety value is seen, a changed target or source is not a safety change', () => {
    expect(safetyChanged(base, { ...base, phi_days: '1' })).toBe(true);
    expect(safetyChanged(base, { ...base, target: 'x', source: 'y' })).toBe(false);
    expect(safetyChanged(base, { ...base })).toBe(false);
  });
  it('editing an unsigned replacement keeps the link and the reason', () => {
    const kept = keepLinks({ ...base, supersedes_id: 'old', change_reason: 'label changed' }, { id: 'a', farm_id: 'f', phi_days: '8' });
    expect(kept.supersedes_id).toBe('old'); expect(kept.change_reason).toBe('label changed');
    expect(keepLinks(base, { id: 'a', farm_id: 'f' })).toEqual({ id: 'a', farm_id: 'f' });
  });
});
