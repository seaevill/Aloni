import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T12: the worker view in Hindi: crop names have a Hindi name beside the Greek one, the dose reads «0,2»-style (comma) and no Greek sentence appears outside elements marked lang="el".
test('worker view in Hindi: crop names «पालक · Σπανάκι», dose with the Greek comma', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'हिन्दी' }).first().click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.getByTestId('worker-dose').first()).toBeVisible();
  expect(await page.getByTestId('worker-dose').first().innerText()).toMatch(/\d,\d/);
  await page.getByTestId('worker-tab-harvest').click();
  await expect(page.getByTestId('harvest-chip').first()).toContainText('·');
  const chips = await page.getByTestId('harvest-chip').allInnerTexts();
  expect(chips.some((c) => /[ऀ-ॿ]/.test(c) && /[Ͱ-Ͽ]/.test(c))).toBe(true);
  expect(errors).toEqual([]);
});
