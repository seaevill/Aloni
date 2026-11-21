import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('a Demo report opens a neutral measurement explanation at 320 px', async ({ page }) => {
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
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  const reading = page.getByTestId('analysis-ph-source').first();
  await expect(reading).toBeVisible();
  expect((await reading.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await reading.click();
  const detail = page.getByTestId('analysis-explain');
  await expect(detail.getByTestId('analysis-reading')).not.toBeEmpty();
  await expect(detail).toContainText('πιο όξινο');
  await expect(detail).toContainText('Χωρίς έγκριση γεωπόνου');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
