import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

// Harvest: «+5» and «+10» next to «+1» so 40 crates are not 40 taps; the typed value, the cutter, the unit and every block stay as they were.
test('owner harvest form: +1, +5, +10 add exactly; the record keeps the total', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more10').click();
  await page.getByTestId('harvest-more10').click();
  await page.getByTestId('harvest-more5').click();
  await page.getByTestId('harvest-more').click();
  await expect(page.getByTestId('harvest-crates')).toHaveValue('26');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  for (const id of ['harvest-more', 'harvest-more5', 'harvest-more10']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(56);
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  expect(errors).toEqual([]);
});

test('worker harvest counter (Demo worker view): the +5 and +10 buttons are 72 px tall and add to the big number', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-tab-harvest').click();
  for (const id of ['harvest-more', 'harvest-more5', 'harvest-more10']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(72);
  await page.getByTestId('harvest-more10').click();
  await page.getByTestId('harvest-more5').click();
  await page.getByTestId('harvest-more').click();
  await expect(page.getByTestId('harvest-count')).toHaveText('16');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
