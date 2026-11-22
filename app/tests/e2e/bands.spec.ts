import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// The crop root uses its approved sage PageHead. The other tab roots still use the band.
test('each tab root uses its approved header (empty farm and Demo)', async ({ page }) => {
  const errors = await iphone(page);
  for (const demo of [false, true]) {
    if (demo) { await page.locator('nav.tabs [data-tab="today"]').click(); }
    if (demo) await page.getByTestId('empty-state').locator('button').nth(1).click();
    for (const id of ['today', 'crops', 'parcels', 'stock', 'more']) {
      await page.locator(`nav.tabs [data-tab="${id}"]`).click();
      if (id === 'crops') {
        await expect(page.locator('main .ds-head h1'), `${id} ${demo}`).toHaveText('Φυτά');
      } else {
        await expect(page.locator('main .band').first(), `${id} ${demo}`).toBeVisible();
      }
    }
  }
  expect(errors).toEqual([]);
});
