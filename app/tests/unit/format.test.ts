import { afterEach, describe, expect, it } from 'vitest';
import { lang } from '../../src/i18n';
import { formatArea, formatDose, formatQty } from '../../src/i18n/format';

afterEach(() => { lang.value = 'el'; });

describe('number formatting never rounds', () => {
  it.each([
    [0.625, '0,625'],
    [2.5, '2,5'],
    [0.025, '0,025'],
    [12, '12'],
    [-0.5, '-0,5'],
    [0.1 + 0.2, '0,30000000000000004'], // what is stored is what is shown: no hidden rounding either way
  ])('formatDose(%s) = %s', (input, out) => expect(formatDose(input)).toBe(out));

  it('string doses keep every digit, including trailing zeros', () => {
    expect(formatDose('0.250')).toBe('0,250');
    expect(formatDose('123456789.123456789')).toBe('123456789,123456789');
    expect(formatDose(' 0.025 ')).toBe('0,025');
  });
  it('small and large numbers are expanded without losing digits', () => {
    expect(formatDose(1e-7)).toBe('0,0000001');
    expect(formatDose(1.5e-7)).toBe('0,00000015');
    expect(formatDose(1e21)).toBe('1000000000000000000000');
  });
  it('formatQty prints 2.5 as 2,5 (the stock screen bug)', () => {
    expect(formatQty(2.5)).toBe('2,5');
    expect(formatQty('4.5')).toBe('4,5');
  });
  it('formatArea does not round 0.625 to 0.63', () => {
    expect(formatArea(0.625)).toBe('0,625 στρ.');
    expect(formatArea(12)).toBe('12 στρ.');
    expect(formatArea('0.6')).toBe('0,6 στρ.');
  });
  it('English uses a dot; Turkish a comma', () => {
    lang.value = 'en';
    expect(formatDose(0.625)).toBe('0.625');
    expect(formatArea(0.625)).toBe('0.625 str.');
    lang.value = 'tr';
    expect(formatArea(0.625)).toBe('0,625 dönüm');
  });
  it('no digit is lost: the text reads back as the same number', () => {
    for (const s of ['0.1', '0.05', '0.0625', '1.000001', '7', '0.999999999', '1234.5678']) {
      expect(formatDose(s).replace(',', '.')).toBe(s);
    }
  });
  it('anything that is not a plain number prints «unknown», never a made-up value', () => {
    for (const bad of [null, undefined, NaN, Infinity, 'abc', '', '1,5', '1.000.5', '0x10', '1e3']) {
      expect(formatDose(bad as never), String(bad)).toBe('— άγνωστο');
    }
    expect(formatArea(null)).toBe('— άγνωστο');
    expect(formatQty(undefined)).toBe('— άγνωστο');
  });
});
