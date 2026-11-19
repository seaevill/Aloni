// Exact decimal arithmetic for the audit export. The app stores a dose per στρέμμα (1 στρ = 0.1 ha) and an area in στρέμματα, as typed. The export adds the hectare equivalents WITHOUT rounding:
// dose per ha = dose per στρ × 10, area in ha = area in στρ ÷ 10. Multiplying or dividing by a power of ten only moves the decimal point of the TEXT, so no floating point is involved.

/** «0.025» moved `places` places to the right (negative = left): shiftDecimal('0.025', 1) = '0.25', shiftDecimal('12', -1) = '1.2'. A text that is not a plain decimal gives undefined. */
export function shiftDecimal(value: string, places: number): string | undefined {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) return undefined;
  const sign = m[1]; const whole = m[2]; const frac = m[3] === undefined ? '' : m[3];   // no fraction digits = an empty text, not a number
  const lead = Math.max(0, 1 - (whole.length + places));      // zeros to put in front when the point moves left past the first digit
  const d0 = '0'.repeat(lead) + whole + frac;
  const point = whole.length + places + lead;
  const d = d0 + '0'.repeat(Math.max(0, point - d0.length));
  const int = d.slice(0, point).replace(/^0+(?=\d)/, '');
  const dec = d.slice(point).replace(/0+$/, '');
  return `${sign}${int}${dec ? `.${dec}` : ''}`.replace(/^-0$/, '0');
}

/** The dose per HECTARE in the units the Annex asks for (kg or L). Only a dose per στρέμμα can be converted; a dose per 100 L of water has no area, so it gives undefined (never guessed). */
export function dosePerHa(dose: string, unit: string): { amount: string; unit: 'L/ha' | 'kg/ha' } | undefined {
  const perStr: Record<string, { shift: number; unit: 'L/ha' | 'kg/ha' }> = {
    'ml/str': { shift: 1 - 3, unit: 'L/ha' },   // ×10 per ha, ÷1000 ml→L
    'l/str': { shift: 1, unit: 'L/ha' },
    'g/str': { shift: 1 - 3, unit: 'kg/ha' },   // ×10 per ha, ÷1000 g→kg
    'kg/str': { shift: 1, unit: 'kg/ha' },
  };
  const c = perStr[unit];
  const amount = c ? shiftDecimal(dose, c.shift) : undefined;
  return c && amount !== undefined ? { amount, unit: c.unit } : undefined;
}

export const areaHa = (areaStr: string): string | undefined => shiftDecimal(areaStr, -1);
