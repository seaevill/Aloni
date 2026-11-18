import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The font ships with the app: no Google Fonts link, no network, works offline (CSP: font-src 'self').
const src = (rel: string) => new URL(`../../src/${rel}`, import.meta.url);
describe('Commissioner is bundled', () => {
  const css = readFileSync(src('ui/fonts.css'), 'utf8');
  it('every @font-face points at a woff2 file that exists in the repo, and nothing is loaded from the network', () => {
    const files = [...css.matchAll(/url\(\.\.\/fonts\/([\w.-]+\.woff2)\)/g)].map((m) => m[1]);
    expect(new Set(files).size).toBe(3); // Greek, Latin, Latin Extended (Turkish)
    for (const f of files) expect(existsSync(src(`fonts/${f}`)), f).toBe(true);
    expect(css).not.toMatch(/https?:|\/\/fonts\./);
  });
  it('the licence (SIL OFL) is shipped next to the font, and index.html links no font host', () => {
    expect(readFileSync(src('fonts/OFL.txt'), 'utf8')).toContain('SIL Open Font License');
    expect(readFileSync(new URL('../../index.html', import.meta.url), 'utf8')).not.toMatch(/fonts\.(googleapis|gstatic)/);
  });
  it('the font family is a token, with the system fonts as the fallback', () => {
    expect(readFileSync(src('ui/tokens.css'), 'utf8')).toMatch(/--font:"Commissioner",system-ui/);
  });
});
