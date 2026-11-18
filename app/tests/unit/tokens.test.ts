import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Theme preparation: every colour, text size, space, corner and shadow of the screens is a variable in tokens.css. A screen file (styles.css, any .tsx) holds
// no literal value, so a new look changes ONE file. The values themselves stayed as they were (the screens look the same).
const read = (rel: string) => readFileSync(new URL(`../../src/${rel}`, import.meta.url), 'utf8');
const css = read('ui/styles.css').replace(/\/\*.*?\*\//gs, '');
const tokens = read('ui/tokens.css');
const walk = (dir: string): string[] => readdirSync(new URL(`../../src/${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const LENGTH = /(?<![\w-])\d*\.?\d+(?:px|em|rem)\b/g;
/** Look properties whose value has a number but no var(): a percentage or 0 / 1 / auto is not a «look value». */
const loose = (text: string): string[] => [...text.matchAll(/(?<![\w-])(font-size|padding|margin(?:-\w+)?|gap|border-radius|box-shadow|min-height|min-width|max-width|height|width|left|right|bottom)\s*:\s*([^;}]+)/g)]
  .filter((m) => /\d/.test(m[2]) && !/var\(/.test(m[2]) && !/^(?:0|0 0|0 auto|\d+%|100dvh|1|1fr|auto)$/.test(m[2].trim())).map((m) => m[0]);

describe('no literal look values outside tokens.css', () => {
  it('styles.css has no colour literal (#hex, rgb(), hsl()) and no px/em/rem length at all', () => {
    expect(css.match(COLOUR) ?? []).toEqual([]);
    expect(css.match(LENGTH) ?? []).toEqual([]);
  });
  it('styles.css has no font-size, spacing, radius or shadow that is not a variable', () => expect(loose(css)).toEqual([]));
  it('the check itself goes red on a literal', () => {
    const bad = '.x{padding:7px;color:#abc;font-size:15px;border-radius:5px;box-shadow:0 1px 2px #000}';
    expect(bad.match(COLOUR)).toHaveLength(2);
    expect(bad.match(LENGTH)).toHaveLength(5);
    expect(loose(bad)).toHaveLength(4);
  });
  it('no screen file sets a style, a colour or a size by itself', () => {
    const hits = walk('ui').filter((f) => f.endsWith('.tsx')).flatMap((f) => (read(f).match(/\bstyle=|#[0-9a-fA-F]{6}\b|\d+px/g) ?? []).map((m) => `${f}: ${m}`));
    expect(hits).toEqual([]);
  });
  it('every var(--x) used in styles.css is defined in tokens.css', () => {
    const used = new Set([...css.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]));
    const defined = new Set([...tokens.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
    expect([...used].filter((u) => !defined.has(u))).toEqual([]);
  });
});
