import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// is-7: Αποθήκη left the bottom bar; it opens from the Άλλα menu. The screen itself, the address and the saved place are unchanged.
test('Αποθήκη is not in the bottom bar; Άλλα has a row that opens it, and Άλλα stays the current tab', async ({ page }) => {
  const errors = await iphone(page);
  await expect(page.locator('nav.tabs [data-tab="stock"]')).toHaveCount(0);
  await expect(page.locator('nav.tabs button')).toHaveCount(4);
  await page.locator('nav.tabs [data-tab="more"]').click();
  const row = page.getByTestId('open-stock');
  await expect(row).toBeVisible();
  expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await row.click();
  await expect(page.locator('h1')).toContainText('Αποθήκη');
  await expect(page).toHaveURL(/#\/own\/stock/);
  await expect(page.locator('nav.tabs [data-tab="more"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('nav.tabs [data-tab="more"]').click();                               // Άλλα again: back to the menu
  await expect(page.getByTestId('more-menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('an old link to #/own/stock still opens Αποθήκη (nothing is lost)', async ({ page }) => {
  await iphone(page);
  await page.goto('/#/own/stock');
  await expect(page.locator('h1')).toContainText('Αποθήκη');
  await expect(page.locator('nav.tabs [data-tab="more"]')).toHaveAttribute('aria-current', 'page');
});
