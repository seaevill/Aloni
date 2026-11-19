import { afterEach, describe, expect, it } from 'vitest';
import { lang } from '../../src/i18n';
import { parseDecimal } from '@aloni/rules-core';
import { formatArea, formatDose, formatQty } from '../../src/i18n/format';

const dose = (s: string) => formatDose(parseDecimal(s));

afterEach(() => { lang.value = 'el'; });

describe('number formatting never rounds', () => {
  it.each([
    ['0.625', '0,625'],
    ['2,5', '2,5'],
    ['0.025', '0,025'],
    ['12', '12'],
    ['0.30000000000000004', '0,30000000000000004'], // what is stored is what is shown: no hidden rounding either way
  ])('formatDose(%s) = %s', (input, out) => expect(dose(input)).toBe(out));

  it('string doses keep every digit, including trailing zeros', () => {
    expect(dose('0.250')).toBe('0,250');
    expect(dose('123456789.123456789')).toBe('123456789,123456789');
    expect(dose(' 0.025 ')).toBe('0,025');
  });
  it('small and large numbers are expanded without losing digits', () => {
    expect(formatQty(1e-7)).toBe('0,0000001');
    expect(formatQty(1.5e-7)).toBe('0,00000015');
    expect(formatQty(1e21)).toBe('1000000000000000000000');
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
    expect(dose('0.625')).toBe('0.625');
    expect(formatArea(0.625)).toBe('0.625 str.');
    lang.value = 'tr';
    expect(formatArea(0.625)).toBe('0,625 dönüm');
  });
  it('no digit is lost: the text reads back as the same number', () => {
    for (const s of ['0.1', '0.05', '0.0625', '1.000001', '7', '0.999999999', '1234.5678']) {
      expect(dose(s).replace(',', '.')).toBe(s);
    }
  });
  it('an unknown or invalid dose prints «unknown», never a made-up value', () => {
    for (const bad of ['', 'abc', '1.000', '1,000', '1e3', 'NaN', '-1']) expect(dose(bad), bad).toBe('— άγνωστο');
    for (const bad of [null, undefined, NaN, Infinity, 'abc', '', '1,5', '1.000.5', '0x10', '1e3']) expect(formatQty(bad as never), String(bad)).toBe('— άγνωστο');
    expect(formatArea(null)).toBe('— άγνωστο');
    expect(formatQty(undefined)).toBe('— άγνωστο');
  });
});

describe('negative numbers use a real minus sign', () => {
  it('«−0,75» (U+2212), never a hyphen, in every language', () => {
    for (const l of ['el', 'tr', 'en'] as const) { lang.value = l; expect(formatQty('-0.75')).toBe(l === 'en' ? '\u22120.75' : '\u22120,75'); }
  });
});

describe('property: a dose typed with a comma comes back out exactly, in every language (never rounded, never shortened)', () => {
  it('2000 seeded doses: parse → show gives the same digits (comma in el/tr, dot in en), trailing zeros kept', () => {
    let x = 99;
    const next = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
    for (let i = 0; i < 2000; i += 1) {
      const whole = String(next() % 500);
      const frac = String(next() % 1000000).padStart(1 + (next() % 6), '0').slice(-(1 + (next() % 6))); // 1–6 digits, zeros included
      if (frac.length === 3 && whole !== '0') continue; // «1,000»-style input is refused by design (see decimal tests)
      const typed = `${whole},${frac}`;
      lang.value = 'el'; expect(dose(typed), typed).toBe(typed);
      lang.value = 'tr'; expect(dose(typed), typed).toBe(typed);
      lang.value = 'en'; expect(dose(typed), typed).toBe(`${whole}.${frac}`);
    }
  });
});

describe('a record\'s name', () => {
  it('is empty — never «undefined» — while the record is not loaded yet (the lists load one after the other)', async () => {
    const { nameOf } = await import('../../src/ui/screens');
    expect(nameOf({})).toBe('');
    expect(nameOf({ id: 'x1' })).toBe('x1');
    expect(nameOf({ name_el: 'Σπανάκι', name_en: 'Spinach' })).toBe('Σπανάκι');
  });
});
