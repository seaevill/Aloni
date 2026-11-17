import { describe, expect, it } from 'vitest';
import { fingerprint, known, makeDose, notOnLabel, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, requireSignOff, type DoseKind, type DoseUnit, type LabelUse } from './index';

const dec = parseDecimal;
const kind = (k: DoseKind) => known(k);
const unit = known<DoseUnit>('ml/str');
const label = (over: Partial<LabelUse> = {}): LabelUse => ({ scope: 'p|c|', dose: makeDose(kind('single'), unit, dec('0,025'), dec('')), phiDays: parsePhiDays('7'), reiHours: parseReiHours('24'), maxApps: parseMaxApps('3'), ...over });
const signed = (u: LabelUse) => ({ by: 'Test Agronomist', on: '2026-11-17', fingerprint: fingerprint(u) });

describe('makeDose: single / range, nothing preselected', () => {
  it('single: one box, min = max chosen by the farmer', () => {
    expect(makeDose(kind('single'), unit, dec('0,025'), dec(''))).toEqual({ known: true, value: { kind: 'single', unit: 'ml/str', min: '0.025', max: '0.025' } });
  });
  it('range needs both values and min <= max', () => {
    expect(makeDose(kind('range'), unit, dec('0,15'), dec('0,25')).known).toBe(true);
    expect(makeDose(kind('range'), unit, dec('0,25'), dec('0,15'))).toEqual({ known: false, reason: 'invalid' });
    expect(makeDose(kind('range'), unit, dec('0,15'), dec(''))).toEqual({ known: false, reason: 'missing' });
  });
  it('no kind or no unit chosen = blocked; «δεν αναγράφεται» = blocked', () => {
    expect(makeDose({ known: false, reason: 'missing' }, unit, dec('1'), dec('1')).known).toBe(false);
    expect(makeDose(kind('single'), { known: false, reason: 'missing' }, dec('1'), dec('1')).known).toBe(false);
    expect(makeDose(kind('single'), unit, notOnLabel(), dec('')).known).toBe(false);
  });
});

describe('requireSignOff: the only way to a SignedLabelUse; everything unclear is «blocked», never «passed»', () => {
  it('complete, signed, unchanged → known', () => {
    const u = label();
    expect(requireSignOff(u, signed(u)).known).toBe(true);
  });
  it('no sign-off, or an empty one → blocked (Μη εγκεκριμένο)', () => {
    expect(requireSignOff(label(), undefined)).toEqual({ known: false, reason: 'missing' });
    expect(requireSignOff(label(), { by: ' ', on: '2026-11-17', fingerprint: fingerprint(label()) }).known).toBe(false);
  });
  it('a label edited after sign-off drops the sign-off', () => {
    const before = label();
    const edited = label({ phiDays: parsePhiDays('3') });
    expect(requireSignOff(edited, signed(before))).toEqual({ known: false, reason: 'invalid' });
  });
  it('any unknown value (missing PHI, invalid REI, not on label) → blocked even if signed', () => {
    for (const bad of [{ phiDays: parsePhiDays('') }, { reiHours: parseReiHours('NaN') }, { maxApps: notOnLabel() }, { dose: makeDose(kind('range'), unit, dec('1'), dec('')) }]) {
      const u = label(bad);
      expect(requireSignOff(u, signed(u)).known, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('a dose of 0 is not a dose; the approval covers WHAT the label is for', () => {
  it('0, 0,0 and 0,000 are invalid (blocked) as a single dose and as either end of a range', () => {
    for (const zero of ['0', '0,0', '0,000']) {
      expect(makeDose(kind('single'), unit, dec(zero), dec('')), zero).toEqual({ known: false, reason: 'invalid' });
      expect(makeDose(kind('range'), unit, dec(zero), dec('1')), zero).toEqual({ known: false, reason: 'invalid' });
      expect(makeDose(kind('range'), unit, dec('1'), dec(zero)).known, zero).toBe(false);
    }
    expect(makeDose(kind('single'), unit, dec('0,001'), dec('')).known).toBe(true);
  });
  it('changing the product, crop or target after the approval drops it', () => {
    const base = label();
    const so = signed(base);
    for (const scope of ['p2|c|', 'p|c2|', 'p|c|aphids']) expect(requireSignOff(label({ scope }), so), scope).toEqual({ known: false, reason: 'invalid' });
    expect(requireSignOff(base, so).known).toBe(true);
  });
});
