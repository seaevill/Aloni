import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('the wordmark «Αλώνι» is in the Σήμερα header and with the version in Άλλα', async ({ page }) => {
  const errors = await iphone(page);
  await expect(page.getByTestId('brand')).toHaveText('Αλώνι');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.locator('main')).toContainText('Αλώνι · έκδοση');
  expect(errors).toEqual([]);
});
