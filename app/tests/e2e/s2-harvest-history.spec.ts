import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('a logged Demo harvest opens its source and shows the missing destination reason', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('history-open').click();
  const source = page.getByTestId('harvest-breakdown-open').first();
  await expect(source).toBeVisible();
  expect((await source.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await source.click();
  await expect(page.getByTestId('harvest-breakdown-count')).toContainText('κλούβ');
  await expect(page.getByTestId('harvest-destination')).toHaveText('άγνωστο – παλιά καταγραφή');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
