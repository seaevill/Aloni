import { describe, expect, it } from 'vitest';
import { fill, pluralKey } from '../../src/i18n/plural';

describe('fill', () => {
  it('replaces every occurrence of every placeholder', () => {
    expect(fill('{n} κλούβες, {n} ακόμα, {name}', { n: 3, name: 'Α' })).toBe('3 κλούβες, 3 ακόμα, Α');
  });
  it('leaves an unknown placeholder visible and numbers print as text', () => {
    expect(fill('x {missing} y {n}', { n: 0.025 })).toBe('x {missing} y 0.025');
    expect(fill('no params {n}')).toBe('no params {n}');
  });
});

describe('pluralKey', () => {
  const dict = new Set(['days.one', 'days.other', 'only.other']);
  const has = (k: string) => dict.has(k);
  it.each(['el', 'tr', 'en'])('%s: 1 is "one", everything else "other"', (loc) => {
    expect(pluralKey(loc, 'days', 1, has)).toBe('days.one');
    for (const n of [0, 2, 5, 11, 21, 100]) expect(pluralKey(loc, 'days', n, has), `${loc} ${n}`).toBe('days.other');
  });
  it('falls back to .other when a form is missing', () => {
    expect(pluralKey('el', 'only', 1, has)).toBe('only.other');
  });
});
