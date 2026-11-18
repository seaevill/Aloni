import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sun-readable UI (Bora): text contrast >= 7:1 (WCAG AAA), borders/icons >= 3:1.
// Every colour used in styles.css must be listed here, so a new colour cannot slip in without a contrast check.
const css = ['tokens.css', 'styles.css'].map((f) => readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8')).join('\n'); // the colours live in tokens.css
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(css)?.[1] ?? '';

const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const BG = token('bg'), CARD = token('card'), FG = token('fg'), GREEN = token('green'), WARN = token('warn'), LINE = token('line'), FIELD = token('field');
const MUTED = token('muted'), TAB = token('tab'), AMBER_BG = token('amber-bg'), AMBER_FG = token('amber-fg'), DANGER = token('danger'), CALM_BG = token('calm-bg'), CALM_FG = token('calm-fg'), FOREST2 = token('forest-2'), LIME = token('lime'), ON_LIME = token('on-lime');
const TEXT: Array<[string, string, string]> = [
  ['text on page', FG, BG], ['text on card', FG, CARD],
  ['muted text on page', MUTED, BG], ['muted text on card', MUTED, CARD],
  ['tab label', TAB, BG], ['active tab label', FOREST2, BG], ['active tab icon pill (lime is only a fill)', ON_LIME, LIME], ['active tab / secondary button / message', GREEN, CARD], ['message on page', GREEN, BG],
  ['primary button', '#fff', GREEN], ['danger button', WARN, CARD], ['badge', '#fff', WARN], ['draft banner and sync chip', AMBER_FG, AMBER_BG], ['toast', '#fff', FG], ['blocked badge', '#fff', DANGER], ['calm chip', CALM_FG, CALM_BG],
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
