import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sun-readable UI (Bora): text contrast >= 7:1 (WCAG AAA), borders/icons >= 3:1.
// Every colour used in styles.css must be listed here, so a new colour cannot slip in without a contrast check.
const css = readFileSync(new URL('../../src/ui/styles.css', import.meta.url), 'utf8');
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(css)?.[1] ?? '';

const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const BG = token('bg'), CARD = token('card'), FG = token('fg'), GREEN = token('green'), WARN = token('warn'), LINE = token('line'), FIELD = token('field');
const TEXT: Array<[string, string, string]> = [
  ['text on page', FG, BG], ['text on card', FG, CARD],
  ['muted text on page', '#4a4f47', BG], ['muted text on card', '#4a4f47', CARD],
  ['tab label', '#3d423b', CARD], ['active tab / secondary button / message', GREEN, CARD], ['message on page', GREEN, BG],
  ['primary button', '#fff', GREEN], ['danger button', WARN, CARD], ['badge', '#fff', WARN], ['draft banner', '#4a2500', '#fff3cd'],
];

describe('colour contrast', () => {
  for (const [name, fg, bg] of TEXT) it(`${name} >= 7:1`, () => expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(7));
  it('input borders and the active-tab bar are >= 3:1 (the card hairline is decorative)', () => {
    expect(ratio(FIELD, CARD)).toBeGreaterThanOrEqual(3);
    expect(ratio(FIELD, BG)).toBeGreaterThanOrEqual(3);
    expect(ratio(GREEN, CARD)).toBeGreaterThanOrEqual(3);
  });
  it('every colour in styles.css is covered by a pair above', () => {
    const listed = new Set([...TEXT.flat(), LINE, FIELD].map((c) => c.toLowerCase().replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3')));
    const used = [...css.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0].toLowerCase().replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3'));
    expect(used.filter((c) => !listed.has(c))).toEqual([]);
  });
});
