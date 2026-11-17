import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { eachScreen, iphone } from './helpers/iphone';

// Full-page PNG of every screen × language × (empty | demo). CI always uploads them as the artifact `screens-<PR#>`; no pixel diffs yet.
test('screenshots of every screen', async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync('screenshots', { recursive: true });
  await iphone(page);
  await eachScreen(page, async ({ lang, route, state }) => {
    await page.screenshot({ path: `screenshots/${state}-${lang}-${route}.png`, fullPage: true });
  });
});
