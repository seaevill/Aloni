import { describe, expect, it } from 'vitest';
import { buildLabelUse, withSignOff, type LabelUseInput } from '../../src/labels/label-use';
import { sprayCalc } from '../../src/spraycalc/spraycalc';

const NOW = '2026-11-10T10:00:00.000Z';
const field = (text: string) => ({ notOnLabel: false, text });
const input = (over: Partial<LabelUseInput> = {}): LabelUseInput => ({
  productId: 'prod', cropId: 'crop', target: '', source: 'ΕΠΙΔΕΙΞΗ', kind: 'single', unit: 'ml/str',
  doseMin: field('150'), doseMax: field(''), phi: field('7'), rei: field('24'), maxApps: field('3'), ...over,
});
const label = (over: Partial<LabelUseInput> = {}, signed = true) => {
  const r = buildLabelUse(input(over), 'farm', NOW, 'lu1');
  if (!r.ok) throw new Error('fixture');
  return signed ? (withSignOff(r.row, 'Agronomist (fictional)', '2026-11-01', NOW) ?? r.row) : r.row;
};

describe('spray tank: the SIGNED label dose × the area, exactly; the app chooses nothing', () => {
  it('a per-στρέμμα dose × the area is an exact decimal, in the label\'s own unit', () => {
    const c = sprayCalc(label(), '2,5', undefined, undefined);
    expect(c).toMatchObject({ ok: true });
    if (c.ok) expect(c.doses).toEqual([{ which: 'single', product: { known: true, amount: '375', unit: 'ml' } }]);
  });
  it('a dose with a decimal comma stays exact (no floating point): 0,075 l/στρ. × 1,5 = 0,1125 l', () => {
    const c = sprayCalc(label({ unit: 'l/str', doseMin: field('0,075') }), '1,5', undefined, undefined);
    if (!c.ok) throw new Error('should be ok');
    expect(c.doses[0]?.product).toEqual({ known: true, amount: '0.1125', unit: 'l' });
  });
  it('a RANGE label shows both ends and does not pick one', () => {
    const c = sprayCalc(label({ kind: 'range', doseMin: field('100'), doseMax: field('150') }), '2', undefined, undefined);
    if (!c.ok) throw new Error('should be ok');
    expect(c.doses.map((d) => [d.which, d.product.known ? d.product.amount : 'unknown'])).toEqual([['min', '200'], ['max', '300']]);
  });
  it('an UNSIGNED, changed or incomplete label gives no number at all', () => {
    expect(sprayCalc(label({}, false), '2', undefined, undefined)).toEqual({ ok: false, reason: 'unsigned' });
    const open = buildLabelUse(input({ doseMin: field('') }), 'farm', NOW, 'lu2');
    if (!open.ok) throw new Error('fixture');
    expect(sprayCalc(withSignOff(open.row, 'x', '2026-11-01', NOW) ?? open.row, '2', undefined, undefined)).toEqual({ ok: false, reason: 'unsigned' });
  });
  it('a missing or unreadable area is unknown, never 0', () => {
    expect(sprayCalc(label(), '', undefined, undefined)).toEqual({ ok: false, reason: 'no-area' });
    expect(sprayCalc(label(), 'abc', undefined, undefined)).toEqual({ ok: false, reason: 'no-area' });
    expect(sprayCalc(label(), '0', undefined, undefined)).toEqual({ ok: false, reason: 'no-area' });
  });
  it('a per-100-l dose needs the water the grower uses (l per στρέμμα): product = dose × water ÷ 100; without it that line is unknown', () => {
    const per100 = label({ unit: 'ml/100l', doseMin: field('50') });
    const without = sprayCalc(per100, '2', undefined, undefined);
    if (!without.ok) throw new Error('ok');
    expect(without.doses[0]?.product).toEqual({ known: false, reason: 'no-water' });
    const withWater = sprayCalc(per100, '2', undefined, '80');           // 2 στρ. × 80 l = 160 l → 50 ml × 1,6
    if (!withWater.ok) throw new Error('ok');
    expect(withWater.doses[0]?.product).toEqual({ known: true, amount: '80', unit: 'ml' });
    expect(withWater.water).toEqual({ known: true, litres: '160' });
  });
  it('tanks = the water ÷ the tank, counted up (a partly filled last tank is still a tank); needs both numbers the grower typed', () => {
    const c = sprayCalc(label(), '2', '600', '80');                       // 160 l in a 600 l tank
    if (!c.ok) throw new Error('ok');
    expect(c.tanks).toEqual({ known: true, count: '1' });
    const c2 = sprayCalc(label(), '10', '200', '80');                     // 800 l in a 200 l tank
    if (!c2.ok) throw new Error('ok');
    expect(c2.tanks).toEqual({ known: true, count: '4' });
    const c3 = sprayCalc(label(), '10', '300', '80');                     // 800 / 300 = 2,67 → 3
    if (!c3.ok) throw new Error('ok');
    expect(c3.tanks).toEqual({ known: true, count: '3' });
    const none = sprayCalc(label(), '10', undefined, '80');
    if (!none.ok) throw new Error('ok');
    expect(none.tanks).toEqual({ known: false });
  });
});
