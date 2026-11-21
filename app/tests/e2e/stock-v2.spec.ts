import { expect, test } from '@playwright/test';

test('Demo stock cards show the recorded group and substance at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="stock"]').click();

  const copper = page.getByTestId('product').filter({ hasText: 'χαλκού' });
  await expect(copper.getByTestId('stock-group')).toHaveText('FRAC M01');
  await expect(copper.getByTestId('stock-active')).toHaveText('copper hydroxide');
  await expect(copper.getByTestId('product-noreg')).toBeVisible();
  const filter = page.getByTestId('stock-filter-all');
  expect((await filter.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
