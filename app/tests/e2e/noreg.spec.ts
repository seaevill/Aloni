import { expect, test } from '@playwright/test';
import { setup } from './helpers/farm';
import { iphone } from './helpers/iphone';

// T17: a product without an authorisation number says so, on its card and in the spray form (the inspector asks for it).
test('missing authorisation number: note on the product card and in the spray form', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await expect(page.getByTestId('product-noreg').first()).toBeVisible();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await expect(page.getByTestId('spray-noreg')).toBeVisible();
  expect(errors).toEqual([]);
});
