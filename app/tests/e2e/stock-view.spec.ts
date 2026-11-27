import { expect, test } from '@playwright/test';
import { openStock } from './helpers/tabs';
import { iphone } from './helpers/iphone';

test('Αποθήκη (prototype layout): dark band, type filters narrow the list, the waiting period shows only from approved labels', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();          // the demo farm
  await openStock(page);
  await expect(page.locator('header.band')).toBeVisible();
  await expect(page.getByTestId('product').first()).toBeVisible();
  const all = await page.getByTestId('product').count();
  expect(all).toBeGreaterThan(2);
  await page.getByTestId('stock-filters').locator('button').nth(1).click();
  const type = (await page.locator('.tag-btn[aria-pressed="true"]').textContent()) ?? '';
  const some = await page.getByTestId('product').count();
  expect(some).toBeGreaterThan(0); expect(some).toBeLessThan(all);
  for (const c of await page.getByTestId('product').all()) await expect(c.locator('.tag').first()).toHaveText(type);
  for (const phi of await page.getByTestId('product-phi').all()) await expect(phi).toContainText('ημ.');
  await page.getByTestId('stock-filter-all').click();
  await expect(page.getByTestId('product')).toHaveCount(all);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
});
