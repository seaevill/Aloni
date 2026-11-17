import { describe, expect, it } from 'vitest';
import { dateAfterDays, known, notOnLabel, parsePhiDays, parseReiHours, phiEnd, reiEnd, waitOver, fingerprint, makeDose, parseDecimal, parseMaxApps, requireSignOff, type DoseUnit, type LabelUse } from './index';

// A small seeded generator: the same run every time, no clock, no Math.random (rules-core is deterministic).
function seeded(seed: number) {
  let x = seed;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x; }; // callers reduce it with a literal modulus
}
const pad2 = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, mo: number, d: number, h: number, mi: number, s: number) => `${String(y).padStart(4, '0')}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(s)}Z`;
const refEpoch = (s: string) => Date.parse(s) / 1000; // independent reference: the JS engine's own calendar (tests only)

describe('safe side: a wait that cannot be computed is «blocked», never «over» (NaN, Invalid Date, missing PHI)', () => {
  const sprayed = '2026-11-17T08:00:00Z';
  it('missing, not-on-label or invalid PHI/REI → unknown, and unknown is never over', () => {
    for (const bad of ['', ' ', 'NaN', 'Infinity', '-1', '1.5', '7 days', '1e2', 'Invalid Date']) {
      expect(phiEnd(sprayed, parsePhiDays(bad)).known, `phi ${bad}`).toBe(false);
      expect(reiEnd(sprayed, parseReiHours(bad)).known, `rei ${bad}`).toBe(false);
      expect(waitOver('2099-01-01T00:00:00Z', phiEnd(sprayed, parsePhiDays(bad))), bad).toBe(false);
    }
    expect(phiEnd(sprayed, notOnLabel())).toEqual({ known: false, reason: 'not_on_label' });
    expect(waitOver('2099-01-01T00:00:00Z', notOnLabel())).toBe(false);
  });
  it('an invalid spraying time or «now» → unknown / not over', () => {
    for (const bad of ['', 'Invalid Date', 'NaN', '2026-11-17', '2026-11-17T08:00:00', '2026-02-31T08:00:00Z', '2026-11-17T24:00:00Z', '2026-11-17T08:60:00Z', '2026-13-01T00:00:00Z', '1969-12-31T23:59:59Z']) {
      expect(phiEnd(bad, parsePhiDays('7')).known, `sprayed ${bad}`).toBe(false);
      expect(waitOver(bad, known('2026-01-01T00:00:00Z')), `now ${bad}`).toBe(false);
    }
  });
  it('over only strictly after the end; at the end it is still NOT over', () => {
    const end = phiEnd(sprayed, parsePhiDays('7'));
    expect(end).toEqual({ known: true, value: '2026-11-24T08:00:00Z' });
    expect(waitOver('2026-11-24T08:00:00Z', end)).toBe(false);
    expect(waitOver('2026-11-24T08:00:01Z', end)).toBe(true);
    expect(waitOver('2026-11-24T07:59:59Z', end)).toBe(false);
  });
  it('a sign-off needs a real date: «Invalid Date» and impossible days do not sign', () => {
    const u: LabelUse = { dose: makeDose(known('single'), known<DoseUnit>('ml/str'), parseDecimal('0,025'), parseDecimal('')), phiDays: parsePhiDays('7'), reiHours: parseReiHours('24'), maxApps: parseMaxApps('3') };
    for (const on of ['Invalid Date', '', 'NaN', '2026-02-31', '17/11/2026', '2026-11-17T00:00:00Z']) expect(requireSignOff(u, { by: 'Agronomist', on, fingerprint: fingerprint(u) }).known, on).toBe(false);
    expect(requireSignOff(u, { by: 'Agronomist', on: '2026-11-17', fingerprint: fingerprint(u) }).known).toBe(true);
  });
});

describe('property: a computed PHI/REI is exact (never shorter, never rounded) for 2000 random cases', () => {
  const rnd = seeded(20261117);
  const cases = Array.from({ length: 2000 }, () => ({
    y: 1970 + (rnd() % 120), mo: 1 + (rnd() % 12), d: 1 + (rnd() % 28), h: rnd() % 24, mi: rnd() % 60, s: rnd() % 60, phi: rnd() % 400, rei: rnd() % 2000,
  }));
  it('end − start is exactly PHI × 24 h and REI × 1 h, and never earlier than the label says', () => {
    for (const c of cases) {
      const start = iso(c.y, c.mo, c.d, c.h, c.mi, c.s);
      const p = phiEnd(start, parsePhiDays(String(c.phi)));
      const r = reiEnd(start, parseReiHours(String(c.rei)));
      if (!p.known || !r.known) throw new Error(`unexpected unknown for ${start}`);
      expect(refEpoch(p.value) - refEpoch(start), start).toBe(c.phi * 86400);
      expect(refEpoch(r.value) - refEpoch(start), start).toBe(c.rei * 3600);
      expect(refEpoch(p.value)).toBeGreaterThanOrEqual(refEpoch(start) + c.phi * 86400); // never shortened
    }
  });
  it('a longer PHI/REI never ends earlier; PHI 0 ends exactly at the spraying time (not before, not rounded to midnight)', () => {
    for (const c of cases.slice(0, 500)) {
      const start = iso(c.y, c.mo, c.d, c.h, c.mi, c.s);
      const a = phiEnd(start, parsePhiDays(String(c.phi)));
      const b = phiEnd(start, parsePhiDays(String(c.phi + 1)));
      if (!a.known || !b.known) throw new Error('unexpected unknown');
      expect(refEpoch(b.value)).toBeGreaterThan(refEpoch(a.value));
      expect(phiEnd(start, parsePhiDays('0'))).toEqual({ known: true, value: start });
    }
  });
  it('the typed whole numbers survive untouched: «7» is 7, «7,5» / «6.9» are refused, never rounded to 7 or 8', () => {
    for (let n = 0; n <= 9999; n += 7) expect(parsePhiDays(String(n))).toEqual({ known: true, value: n });
    for (const frac of ['7,5', '6.9', '0.5', '7.0']) expect(parsePhiDays(frac).known, frac).toBe(false);
  });
});

describe('property: editing any label value after the sign-off drops the sign-off (a PHI can never be silently shortened)', () => {
  it('every changed PHI, REI, max applications or dose changes the fingerprint', () => {
    const rnd = seeded(7);
    const mk = (phi: number, rei: number, apps: number, dose: string): LabelUse => ({ dose: makeDose(known('single'), known<DoseUnit>('ml/str'), parseDecimal(dose), parseDecimal('')), phiDays: parsePhiDays(String(phi)), reiHours: parseReiHours(String(rei)), maxApps: parseMaxApps(String(apps)) });
    for (let i = 0; i < 300; i += 1) {
      const [phi, rei, apps] = [rnd() % 60, rnd() % 200, 1 + (rnd() % 9)];
      const base = mk(phi, rei, apps, '0,025');
      const signed = { by: 'Agronomist', on: '2026-11-17', fingerprint: fingerprint(base) };
      expect(requireSignOff(base, signed).known).toBe(true);
      for (const edited of [mk(phi + 1, rei, apps, '0,025'), mk(phi === 0 ? 1 : phi - 1, rei, apps, '0,025'), mk(phi, rei + 1, apps, '0,025'), mk(phi, rei, apps + 1, '0,025'), mk(phi, rei, apps, '0,0250')]) {
        expect(requireSignOff(edited, signed), 'edited').toEqual({ known: false, reason: 'invalid' });
      }
    }
  });
});

describe('dateAfterDays', () => {
  it('adds whole days across months, years and leap days; a date that is not real gives unknown', () => {
    expect(dateAfterDays('2026-11-20', 60)).toEqual({ known: true, value: '2027-01-19' });
    expect(dateAfterDays('2027-12-31', 1)).toEqual({ known: true, value: '2028-01-01' });
    expect(dateAfterDays('2028-02-28', 1)).toEqual({ known: true, value: '2028-02-29' });
    expect(dateAfterDays('2026-11-20', 0)).toEqual({ known: true, value: '2026-11-20' });
    for (const bad of ['', 'Invalid Date', '2026-02-31']) expect(dateAfterDays(bad, 5).known, bad).toBe(false);
  });
});
