import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// UX bar (ux-qa.md §1): nothing smaller than 14 px, badges included. Stop-gap until the Playwright ux-bar spec (M1 PR 3).
describe('CSS font sizes', () => {
  it('no font-size below 14px', () => {
    const css = readFileSync(new URL('../../src/ui/styles.css', import.meta.url), 'utf8');
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((s) => s < 14)).toEqual([]);
  });
});
