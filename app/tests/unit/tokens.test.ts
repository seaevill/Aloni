import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Theme preparation: every colour, text size, space, corner and shadow of the screens is a variable in tokens.css. A screen file (styles.css, any .tsx) holds
// no literal value, so a new look changes ONE file. The values themselves stayed as they were (the screens look the same).
const read = (rel: string) => readFileSync(new URL(`../../src/${rel}`, import.meta.url), 'utf8');
const strip = (text: string): string => text.replace(/\/\*.*?\*\//gs, '');
// A media condition cannot read a custom property, so its px/em is the one place a literal length may stand outside tokens.css.
const noMediaConditions = (text: string): string => text.replace(/@media[^{]*\{/g, '{');
const css = strip(read('ui/styles.css'));
const tokens = read('ui/tokens.css');
const walk = (dir: string): string[] => readdirSync(new URL(`../../src/${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

// Every stylesheet of the screens except the tokens themselves. Print-only files are an explicit allow-list: a printed label is black on white at fixed sizes whatever the theme.
const PRINT_ONLY = ['ui/crate-label.css', 'ui/money-print.css', 'ui/register-print.css'];
const sideCss = (): Record<string, string> => Object.fromEntries(walk('ui').filter((f) => f.endsWith('.css') && f !== 'ui/tokens.css' && f !== 'ui/styles.css' && !PRINT_ONLY.includes(f)).map((f) => [f, noMediaConditions(strip(read(f)))]));
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const LENGTH = /(?<![\w-])\d*\.?\d+(?:px|em|rem)\b/g;
/** Look properties whose value has a number but no var(): a percentage or 0 / 1 / auto is not a «look value»; a paper size (mm, cm, in, pt for @page) is not a screen length. */
const loose = (text: string): string[] => [...text.matchAll(/(?<![\w-])(font-size|padding|margin(?:-\w+)?|gap|border-radius|box-shadow|min-height|min-width|max-width|height|width|left|right|bottom)\s*:\s*([^;}]+)/g)]
  .filter((m) => /\d/.test(m[2]) && !/var\(/.test(m[2]) && !/^(?:0|0 0|0 auto|\d+%|100dvh|1|1fr|auto)$/.test(m[2].trim()) && !/^[\d.]+(?:mm|cm|in|pt)(?:\s+[\d.]+(?:mm|cm|in|pt))*$/.test(m[2].trim())).map((m) => m[0]);

describe('no literal look values outside tokens.css', () => {
  it('styles.css has no colour literal (#hex, rgb(), hsl()) and no px/em/rem length at all', () => {
    expect(css.match(COLOUR) ?? []).toEqual([]);
    expect(css.match(LENGTH) ?? []).toEqual([]);
  });
  it('styles.css has no font-size, spacing, radius or shadow that is not a variable', () => expect(loose(css)).toEqual([]));
  it('every other stylesheet in src/ui (side files, ds/, cx/) holds no literal colour, length or look value either', () => {
    const files = sideCss();
    expect(Object.keys(files).length).toBeGreaterThan(20);   // a walk that finds nothing would pass for the wrong reason
    const hits = Object.entries(files).flatMap(([f, text]) => [...(text.match(COLOUR) ?? []), ...(text.match(LENGTH) ?? []), ...loose(text)].map((m) => `${f}: ${m}`));
    expect(hits).toEqual([]);
  });
  it('the print-only allow-list names real files (a rename cannot silently widen it)', () => {
    const all = walk('ui');
    expect(PRINT_ONLY.filter((f) => !all.includes(f))).toEqual([]);
  });
  it('escape attempt: a literal inside @media still counts, only the media condition is exempt', () => {
    const text = noMediaConditions('@media (min-width: 320px) { .x { gap: 8px; color: #fff } }');
    expect(text.match(LENGTH)).toEqual(['8px']);
    expect(text.match(COLOUR)).toEqual(['#fff']);
  });
  it('src/**/*.ts(x) holds no colour literal: a canvas or SVG string reads its colours from tokens.css', () => {
    const hits = walk('.').filter((f) => /\.tsx?$/.test(f)).flatMap((f) => (strip(read(f)).match(COLOUR) ?? []).map((m) => `${f}: ${m}`));
    expect(hits).toEqual([]);
  });
  it('index.html: the only colour literal is the theme-color meta (a meta cannot read a variable) and it equals the brand token', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const meta = /<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/.exec(html)?.[1];
    expect(meta).toBe(/--brand-forest:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1]);
    expect(html.replace(/<meta name="theme-color"[^>]*>/, '').match(COLOUR) ?? []).toEqual([]);
  });
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
