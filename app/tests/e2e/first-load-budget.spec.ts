import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

// Production build of 9679da3, measured with Node gzip. Use the same input
// as the performance report: scripts and preloaded modules in index.html.
const BASELINE_GZIP_BYTES = 152_112;
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
