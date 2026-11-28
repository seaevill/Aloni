import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// UX bar (ux-qa.md §1): nothing smaller than 14 px, badges included. Stop-gap until the Playwright ux-bar spec (M1 PR 3).
describe('CSS font sizes', () => {
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
    expect(/\.card > summary\s*\{[^}]*min-height:\s*var\(--tap\)/.test(css)).toBe(true);
    expect(/\.planting-open\s*\{[^}]*min-height:\s*var\(--tap\)/.test(css)).toBe(true);
  });
});
