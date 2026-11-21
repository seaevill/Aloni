import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('the crop detail shows its illustration and opens the recorded planting source', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();

  const detail = page.getByTestId('crop-detail');
  await expect(detail.locator('svg[data-crop="spinach"]')).toBeVisible();
  await expect(detail.locator('[lang="la"]')).toHaveText('Spinacia oleracea');
  const tally = detail.getByTestId('tap-number');
  expect((await tally.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await tally.click();
  const source = detail.getByTestId('crop-planting-source');
  await expect(source.getByRole('dialog')).toBeVisible();
  await expect(source).toContainText('Κάτω Κάμπος');
  await expect(source).toContainText('Πάχη Παραλιακό');
  await source.getByTestId('sheet-close').click();
  await expect(source).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
