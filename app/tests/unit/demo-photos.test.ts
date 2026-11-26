import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_PHOTOS, sourceLine } from '../../src/db/demo-season/photos';

const dir = new URL('../../public/demo-photos/', import.meta.url);
const credits = readFileSync(new URL('../../../docs/content/photo-credits.md', import.meta.url), 'utf8');

describe('Demo season photos (queue item 33)', () => {
  it('10–15 photos, only CC BY / CC BY-SA (no NC, no ND), each with author, licence link and Commons page', () => {
    expect(DEMO_PHOTOS.length).toBeGreaterThanOrEqual(10); expect(DEMO_PHOTOS.length).toBeLessThanOrEqual(15);
    for (const p of DEMO_PHOTOS) {
      expect(p.license, p.file).toMatch(/^(CC0|CC BY|CC BY-SA)( \d\.\d)?$/);
      expect(p.license).not.toMatch(/NC|ND/);
      expect(p.author.trim(), p.file).not.toBe('');
      expect(p.licenseUrl, p.file).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(p.page, p.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(sourceLine(p)).toContain(p.author);
    }
  });
  it('every file exists, is a small JPEG (≤ 150 KB, total ≤ 1.5 MB) and is listed in docs/content/photo-credits.md', () => {
    let total = 0;
    for (const p of DEMO_PHOTOS) {
      const f = new URL(p.file, dir);
      expect(existsSync(f), p.file).toBe(true);
      const size = statSync(f).size; total += size;
      expect(size, p.file).toBeLessThanOrEqual(150 * 1024);
      expect([...readFileSync(f).subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      expect(credits, p.file).toContain(p.file); expect(credits).toContain(p.author);
    }
    expect(total).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });
  it('the photos are not part of the service worker precache (lazy, Demo only)', () => {
    const cfg = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
    expect(cfg).toMatch(/globPatterns: \['\*\*\/\*\.\{js,css,html,png,svg,webmanifest,woff2\}'\]/);
  });
});
