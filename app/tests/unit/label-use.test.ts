import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { formatDose } from '../../src/i18n/format';
import { buildLabelUse, DOSE_UNITS, NOT_ON_LABEL, readUse, statusOf, withSignOff, type Field, type LabelUseInput } from '../../src/labels/label-use';
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
    expect(row).toMatchObject({ dose_min: '0.025', dose_kind: 'single', dose_unit: 'ml/str', phi_days: '7', rei_hours: '24', max_apps: '3' });
    const dose = readUse(row).dose;
    expect(dose.known && formatDose({ known: true, value: dose.value.min })).toBe('0,025');
    expect(readUse(build(input({ doseMin: typed('0,250') }))).dose).toMatchObject({ known: true, value: { min: '0.250' } });
    for (const k of ['dose_min', 'phi_days', 'rei_hours', 'max_apps']) expect(typeof row[k], k).toBe('string');
    const db = await newDb();
    await put(db, 'label_uses', row, 'insert');
    expect(await db.label_uses.get('lu-1')).toEqual(row); // survives the database unchanged
  });
  it('single = one box (a typed second dose is NOT kept); range = both, min above max refused, equal allowed', () => {
    expect(build(input({ doseMax: typed('9') })).dose_max).toBeUndefined();
    const range = build(input({ kind: 'range', doseMin: typed('0,15'), doseMax: typed('0,25') }));
    expect(readUse(range).dose).toMatchObject({ known: true, value: { kind: 'range', min: '0.15', max: '0.25' } });
    expect(buildLabelUse(input({ kind: 'range', doseMin: typed('0,25'), doseMax: typed('0,15') }), TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, invalid: new Set(['range']) });
    expect(buildLabelUse(input({ kind: 'range', doseMin: typed('0,25'), doseMax: typed('0,25') }), TEST_FARM_ID, now, 'x').ok).toBe(true);
  });
  it('a typed but unreadable value is refused, never guessed: «1.000» dose, «7,5» PHI, «abc» REI', () => {
    const r = buildLabelUse(input({ doseMin: typed('1.000'), phi: typed('7,5'), rei: typed('abc') }), TEST_FARM_ID, now, 'x');
    expect(r).toMatchObject({ ok: false, invalid: new Set(['doseMin', 'phi', 'rei']) });
  });
  it('a product and a crop are required; the dose unit list is the provisional one (no %, no conversions)', () => {
    expect(buildLabelUse(input({ productId: '' }), TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, product: true, crop: false });
    expect(buildLabelUse(input({ cropId: '' }), TEST_FARM_ID, now, 'x')).toMatchObject({ ok: false, product: false, crop: true });
    expect([...DOSE_UNITS]).toEqual(['ml/str', 'g/str', 'l/str', 'kg/str', 'ml/100l', 'g/100l']);
  });
});

describe('blocked: anything missing, not on the label, or not chosen', () => {
  it('a complete label is «unsigned» (Μη εγκεκριμένο), never «signed» on its own', () => expect(statusOf(build(input()))).toBe('unsigned'));
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
    expect(signed().sign_off).toMatchObject({ by: 'Test Agronomist', on: '2026-11-17' });
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
