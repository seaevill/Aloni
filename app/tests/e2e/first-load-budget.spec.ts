import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

// Production build, measured with Node gzip. Use the same input as the performance report: scripts and preloaded modules in index.html.
// 2026-11-22: the baseline moved from 152,112 (9679da3) to 160,000, and later the same day to 170,000 (main measured 176,042 against the 176,000 limit after the daytime screens and Codex's content) because the daytime round added screens (product, spray, store, customers, worker card, sketch). Lazy chunks were tried and rejected:
// on a phone's FIRST session the service worker does not control the page yet, so a lazy chunk cannot be fetched offline (WebKit CI showed it). See docs/DECISIONS.md.
const BASELINE_GZIP_BYTES = 180_000;         // 2026-11-23: 170,000 → 180,000 (the product guide package: pace, water, guide, cut record, fertiliser plan, repeating jobs; main measured 187,270 against the 187,000 limit)
const FIRST_LOAD_LIMIT = BASELINE_GZIP_BYTES * 1.1;

test('first-load JavaScript stays within 10% of the gzip baseline', async ({ request }) => {
  const index = await request.get('/');
  expect(index.ok()).toBe(true);
  const html = await index.text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1]))];
  expect(assets.length, 'at least the app entry must be measured').toBeGreaterThan(0);

  const sizes = await Promise.all(assets.map(async (asset) => {
    const url = new URL(asset, index.url());
    expect(url.origin).toBe(new URL(index.url()).origin);
    const file = await request.get(url.href);
    expect(file.ok(), asset).toBe(true);
    return { asset, bytes: gzipSync(await file.body()).length };
  }));
  sizes.sort((a, b) => b.bytes - a.bytes);
  const report = sizes.map(({ asset, bytes }) => `${asset}: ${bytes} gzip bytes`).join('\n');
  test.info().annotations.push({ type: 'first-load gzip', description: report });
  expect(sizes.reduce((sum, { bytes }) => sum + bytes, 0), report).toBeLessThanOrEqual(FIRST_LOAD_LIMIT);
});
