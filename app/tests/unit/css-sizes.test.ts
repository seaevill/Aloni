import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// UX bar (ux-qa.md §1): nothing smaller than 14 px, badges included. Stop-gap until the Playwright ux-bar spec (M1 PR 3).
const UI = new URL('../../src/ui/', import.meta.url);
const cssFiles = (dir = ''): string[] => readdirSync(new URL(dir, UI), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? cssFiles(`${dir}${e.name}/`) : e.name.endsWith('.css') ? [`${dir}${e.name}`] : []));
/** Every font-size in a stylesheet in px: a px or rem literal is read as it is (1 rem = 16 px), var(--x) through its token. */
function fontSizes(css: string, tokens: string): number[] {
  const px = (name: string): number => { const m = new RegExp(`--${name}:\\s*([\\d.]+)(px|rem)`).exec(tokens); return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : NaN; };
  return [...css.matchAll(/font-size:\s*(?:([\d.]+)(px|rem)|var\(--([\w-]+))/g)].map((m) => (m[1] ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : px(m[3] ?? '')));
}

describe('CSS font sizes', () => {
  it('no font-size below 14px in ANY stylesheet of src/ui (side files, ds/, cx/), and every var() size resolves', () => {
    const tokens = readFileSync(new URL('tokens.css', UI), 'utf8');
    const files = cssFiles();
    expect(files.length).toBeGreaterThan(20);
    const low = files.flatMap((f) => fontSizes(readFileSync(new URL(f, UI), 'utf8'), tokens).filter((s) => !(s >= 14)).map((s) => `${f}: ${s}`));
    expect(low).toEqual([]);   // NaN (an unresolvable token) also fails: !(NaN >= 14)
  });
  it('escape attempt: rem sizes and unknown tokens are caught', () => {
    expect(fontSizes('.a{font-size:.75rem}.b{font-size:var(--nope)}.c{font-size:1.125rem}', ':root{--fs-14:.875rem}')).toEqual([12, NaN, 18]);
  });

  it('no font-size below 14px', () => {
    const css = readFileSync(new URL('../../src/ui/styles.css', import.meta.url), 'utf8');
    const tokens = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8');
    const px = (name: string) => Number(new RegExp(`--${name}:\\s*([\\d.]+)px`).exec(tokens)?.[1]);
    // font-size:var(--fs-14) is read through its token; a literal px size is read as it is
    const sizes = [...css.matchAll(/font-size:\s*(?:([\d.]+)px|var\(--([\w-]+)\))/g)].map((m) => (m[1] ? Number(m[1]) : px(m[2])));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((s) => s < 14)).toEqual([]);
  });

  it('an unclassed <small> has its own 14 px floor (it was 13.3 px outside .card)', () => {
    const css = readFileSync(new URL('../../src/ui/styles.css', import.meta.url), 'utf8');
    expect(/(^|\n)small\s*\{\s*font-size:\s*var\(--fs-14\)/.test(css)).toBe(true);
  });

  it('card folds and planting chips are full-size tap targets', () => {
    const css = readFileSync(new URL('../../src/ui/styles.css', import.meta.url), 'utf8');
    expect(/orders-map"\]\s*>\s*summary\s*\{[^}]*min-height:\s*var\(--tap\)/.test(css)).toBe(true);
    expect(/\.card > summary/.test(css)).toBe(false); // would change ▸ markers of worker-data, dev-section, crop-planting
    expect(/\.planting-open\s*\{[^}]*min-height:\s*var\(--tap\)/.test(css)).toBe(true);
  });
});
