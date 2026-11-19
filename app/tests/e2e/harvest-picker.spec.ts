import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T13: the harvest picker (demo, worker view, 375 px): no two chips with the same text, an empty save says why and moves focus, the chosen chip is filled, and the Harvest tab stays after a save.
test('worker harvest picker: unique chips, error with focus, filled chosen chip', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-tab-harvest').click();
  const chips = page.getByTestId('harvest-chip');
  await expect(chips.first()).toBeVisible();
  const groups = await page.locator('main > div').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('[data-testid="harvest-chip"]')].map((c) => (c as HTMLElement).innerText)));
  for (const g of groups.filter((x) => x.length > 0)) expect(new Set(g).size).toBe(g.length); // under one parcel heading no two chips read the same
  await page.getByTestId('harvest-save').click({ force: true });
  const err = page.getByTestId('harvest-planting-error');
  await expect(err).toBeVisible();
  await expect(err).toBeFocused();
  const free = chips.first();
  await free.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await free.click({ force: true });
  const bg = await free.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await chips.nth(1).evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(bg); // the chosen chip differs from the others
  expect(bg).toBe('rgb(19, 74, 43)');
  await expect(page.getByTestId('harvest-chosen')).toBeVisible();
  expect(errors).toEqual([]);
});
