import { describe, expect, it } from 'vitest';
import { compareDecimal, parseDecimal, parseWhole, type Decimal } from './index';

const ok = (s: string) => { const r = parseDecimal(s); return r.known ? r.value : r; };

describe('parseDecimal: Greek decimals are never guessed', () => {
  it.each([['0,025', '0.025'], ['0.025', '0.025'], ['12,5', '12.5'], ['7', '7'], [' 0,25 ', '0.25'], ['0.250', '0.250'], ['0,5', '0.5'], ['123456789,123456789', '123456789.123456789']])('%s → %s', (i, o) => expect(ok(i)).toBe(o));
  it.each(['1.000', '1,000', '1,000.5', '1.000,5', '2.500', '1e3', '-1', '+1', '1,', ',5', '1 000', 'abc', '0x10', 'NaN', 'Infinity', '٣'])('%s is invalid, not a guess', (i) => expect(parseDecimal(i)).toEqual({ known: false, reason: 'invalid' }));
  it('nothing typed = missing', () => { expect(parseDecimal('')).toEqual({ known: false, reason: 'missing' }); expect(parseDecimal('   ')).toEqual({ known: false, reason: 'missing' }); });
});

describe('compareDecimal: exact, no floating point', () => {
  const d = (s: string) => s as Decimal;
  it('compares by scaled integers', () => {
    expect(compareDecimal(d('0.1'), d('0.10'))).toBe(0);
    expect(compareDecimal(d('0.025'), d('0.03'))).toBe(-1);
    expect(compareDecimal(d('12.5'), d('9.99'))).toBe(1);
    expect(compareDecimal(d('0.30000000000000004'), d('0.3'))).toBe(1); // floating point would say equal
  });
});

describe('parseWhole (PHI days, REI hours, max applications)', () => {
  it.each([['7', 7], ['0', 0], ['24', 24], [' 3 ', 3]])('%s → %s', (i, o) => expect(parseWhole(i)).toEqual({ known: true, value: o }));
  it.each(['7.5', '7,5', '-1', 'abc', 'NaN', '1e2', '12345'])('%s is invalid', (i) => expect(parseWhole(i)).toEqual({ known: false, reason: 'invalid' }));
  it('empty is missing', () => expect(parseWhole('')).toEqual({ known: false, reason: 'missing' }));
});
