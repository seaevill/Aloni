import { describe, expect, it } from 'vitest';
import { areaHa, dosePerHa, shiftDecimal } from '../../src/export/units';

describe('exact hectare equivalents (no floating point)', () => {
  it('moves the decimal point of the text', () => {
    expect(shiftDecimal('0.025', 1)).toBe('0.25');
    expect(shiftDecimal('12', -1)).toBe('1.2');
    expect(shiftDecimal('0.25', -1)).toBe('0.025');
    expect(shiftDecimal('5', -1)).toBe('0.5');
    expect(shiftDecimal('1.5', 1)).toBe('15');
    expect(shiftDecimal('0.001', -1)).toBe('0.0001');
    expect(shiftDecimal('7.250', 1)).toBe('72.5');
    expect(shiftDecimal('1,5', 1)).toBeUndefined();   // a comma is not a stored decimal
  });
  it('dose per ha = dose per στρ × 10, in L or kg; per 100 L of water has no area', () => {
    expect(dosePerHa('0.025', 'ml/str')).toEqual({ amount: '0.00025', unit: 'L/ha' });   // 0,025 ml/στρ = 0,25 ml/ha = 0,00025 L/ha
    expect(dosePerHa('200', 'g/str')).toEqual({ amount: '2', unit: 'kg/ha' });
    expect(dosePerHa('0.2', 'kg/str')).toEqual({ amount: '2', unit: 'kg/ha' });
    expect(dosePerHa('1.5', 'l/str')).toEqual({ amount: '15', unit: 'L/ha' });
    expect(dosePerHa('150', 'ml/100l')).toBeUndefined();
  });
  it('area in ha = στρ ÷ 10', () => { expect(areaHa('0.625')).toBe('0.0625'); expect(areaHa('12')).toBe('1.2'); });
});
