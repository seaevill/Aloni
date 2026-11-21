import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { iphone } from './helpers/iphone';

// E8: the Hindi font (121 kB) is for worker phones only. It is not in the first install (the offline copy every phone downloads), it is cached the first time Hindi is shown, and it IS used then.
const SW = join(process.cwd(), 'dist', 'sw.js');
test.use({ viewport: { width: 375, height: 812 } });

test('the first install does not carry the Hindi font; the rule that caches it on first use is in the worker', () => {
  test.skip(!existsSync(SW), 'needs the production build (npm run build)');
  const sw = readFileSync(SW, 'utf8');
  expect(sw).not.toMatch(/url:"assets\/noto-sans-devanagari[^"]*\.woff2"/);        // not a precache entry
  expect(sw).toContain('font-hindi');                                              // cached on first use instead
  expect(sw).toMatch(/commissioner-latin-wght-normal[^"]*\.woff2/);               // the fonts the Greek screen needs stay in the first install
});

test('Hindi on the worker screen really uses the Hindi font', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();            // the Demo farm
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-lang').getByRole('button', { name: /hi|हिन्दी/i }).click();
  await expect.poll(() => page.evaluate(() => [...document.fonts].some((f) => f.family.includes('Devanagari') && f.status === 'loaded')), { timeout: 20_000 }).toBe(true);
});
