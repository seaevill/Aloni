import { expect, test } from '@playwright/test';

test('the Demo register promotes record identity and retains draft and export controls at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-register').click();
  const first = page.getByTestId('register-line').first();
  await expect(first.getByTestId('register-record-product')).toBeVisible();
  await expect(first.getByTestId('register-record-end')).toBeVisible();
  await expect(page.getByTestId('register-draft')).toBeVisible();
  for (const id of ['register-csv', 'register-csv-machine', 'register-csv-warnings', 'register-print']) {
    expect((await page.getByTestId(id).boundingBox())?.height).toBeGreaterThanOrEqual(56);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
