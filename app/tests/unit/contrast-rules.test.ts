import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast per CSS RULE (evaluation 2026-11-28, ENV-3). contrast.test.ts checks the token pairs somebody listed;
// this test checks the pair every rule really uses: each rule that sets both `color` and a `background`
// has its var() values resolved from tokens.css (fallbacks included) and must reach 7:1.
// A pair that cannot be computed is a failure, never a pass. A background of none / transparent / inherit sets no
// surface of its own, so there is nothing to compare there.
const UI = new URL('../../src/ui/', import.meta.url).pathname;
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : []; });

const tokensOf = (css: string) => {
  const t = new Map<string, string>();
  for (const m of strip(css).matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!t.has(m[1]!)) t.set(m[1]!, m[2]!.trim());   // :root comes first; later themes (Sun mode) do not replace it
  return t;
};

const rgb = (hex: string): [number, number, number] | null => {
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!h) return null;
  const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
};
const lum = ([r, g, b]: [number, number, number]) => {
  const [x, y, z] = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * x! + 0.7152 * y! + 0.0722 * z!;
};
const ratio = (a: [number, number, number], b: [number, number, number]) => { const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p); return (hi! + 0.05) / (lo! + 0.05); };

/** Resolve a CSS value to a hex colour, or null when it cannot be computed. */
const resolve = (value: string, tokens: Map<string, string>, depth = 0): string | null => {
  const v = value.trim().replace(/\s*!important$/, '');
  if (depth > 6) return null;
  if (v === 'white') return '#ffffff';
  if (v === 'black') return '#000000';
  if (rgb(v)) return v;
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(v);
  if (!m) return null;
  const direct = tokens.get(m[1]!);
  const first = direct === undefined ? null : resolve(direct, tokens, depth + 1);
  if (first) return first;
  return m[2] === undefined ? null : resolve(m[2], tokens, depth + 1);   // a fallback only counts when it is itself computable
};

const NO_SURFACE = new Set(['none', 'transparent', 'inherit', 'initial', 'unset', 'currentcolor']);

/** Every rule that sets a text colour and a surface: [selector, text, surface, ratio or null when not computable]. */
const rulePairs = (css: string, tokens: Map<string, string>) => {
  const out: Array<{ selector: string; text: string; surface: string; ratio: number | null }> = [];
  for (const m of strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const text = /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(m[2]!)?.[1]?.trim();
    const surface = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(m[2]!)?.[1]?.trim();
    if (text === undefined || surface === undefined || NO_SURFACE.has(surface.toLowerCase()) || NO_SURFACE.has(text.toLowerCase())) continue;
    const fg = resolve(text, tokens), bg = resolve(surface, tokens);
    const a = fg ? rgb(fg) : null, b = bg ? rgb(bg) : null;
    out.push({ selector: m[1]!.trim(), text, surface, ratio: a && b ? ratio(a, b) : null });
  }
  return out;
};

const tokensCss = readFileSync(`${UI}tokens.css`, 'utf8');
const TOKENS = tokensOf(tokensCss);

describe('contrast per CSS rule (>= 7:1 on the pair the rule really uses)', () => {
  const files = walk(UI).filter((f) => !f.endsWith('tokens.css'));
  const all = files.flatMap((f) => rulePairs(readFileSync(f, 'utf8'), TOKENS).map((p) => ({ ...p, file: f.slice(UI.length) })));

  it('the scan really sees the rules (a broken parser must not pass by finding nothing)', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(all.length).toBeGreaterThan(50);
  });
  it('every pair is computable', () => expect(all.filter((p) => p.ratio === null).map((p) => `${p.file}: ${p.selector} { color:${p.text}; background:${p.surface} }`)).toEqual([]));
  it('every pair reaches 7:1', () => expect(all.filter((p) => p.ratio !== null && p.ratio < 7).map((p) => `${p.file}: ${p.selector} = ${p.ratio!.toFixed(2)}:1 (color:${p.text}; background:${p.surface})`)).toEqual([]));
});

describe('the guard itself cannot be slipped past', () => {
  const t = tokensOf(':root { --fg:#15251b; --blocked-bg:#6e1708; --blocked-fg:#fff; --card:#fffefa; }');
  const only = (css: string) => rulePairs(css, t)[0];
  it('catches the 2026-11 refused-mark pair (dark text on the dark red, 1.36:1)', () => {
    expect(only('.x { background:var(--blocked-bg, var(--lime-soft)); color:var(--fg); }')!.ratio!).toBeLessThan(2);
  });
  it('passes the repaired pair', () => expect(only('.x { background:var(--blocked-bg); color:var(--blocked-fg); }')!.ratio!).toBeGreaterThanOrEqual(7));
  it('an unknown variable is not computable (null), and a fallback is used only when it is a real colour', () => {
    expect(only('.x { color:var(--nope); background:var(--card); }')!.ratio).toBeNull();
    expect(only('.x { color:var(--fg); background:var(--nope, var(--card)); }')!.ratio!).toBeGreaterThanOrEqual(7);
    expect(only('.x { color:var(--fg); background:var(--nope, var(--also-nope)); }')!.ratio).toBeNull();
  });
  it('a gradient or an rgba() surface is not computable either', () => {
    expect(only('.x { color:var(--fg); background:linear-gradient(#fff,#000); }')!.ratio).toBeNull();
    expect(only('.x { color:var(--fg); background:rgba(0,0,0,.5); }')!.ratio).toBeNull();
  });
});
