import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

// Queue item 8b (Σήμερα, mission D «feedback»): after a record is saved the farmer lands back on Σήμερα at the top. The confirmation
// («recorded» + where it is stored) must be on that FIRST screen, not below the weather and the tomorrow board where nobody scrolls.
test('Σήμερα: the harvest and observation confirmations are on the first screen at 375 px, without scrolling', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('harvest-saved')).toBeInViewport();
  await expect(page.getByTestId('harvest-saved-where')).toBeInViewport();
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-saved')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('observe-saved')).toBeInViewport();
  for (const w of [320, 375, 390]) {
    await page.setViewportSize({ width: w, height: 667 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${w}`).toBeLessThanOrEqual(w);
  }
  expect(errors).toEqual([]);
});
