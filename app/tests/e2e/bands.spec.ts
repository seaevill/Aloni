import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T16: one design language: every tab root starts with the dark band header.
test('every tab root has the band header (empty farm and demo)', async ({ page }) => {
  const errors = await iphone(page);
  for (const demo of [false, true]) {
    if (demo) { await page.locator('nav.tabs [data-tab="today"]').click(); }
    if (demo) await page.getByTestId('empty-state').locator('button').nth(1).click();
    for (const id of ['today', 'crops', 'parcels', 'stock', 'more']) {
      await page.locator(`nav.tabs [data-tab="${id}"]`).click();
      await expect(page.locator('main .band').first(), `${id} ${demo}`).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
