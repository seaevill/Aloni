import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// T8: on a 375 × 812 phone «Κοπή σήμερα», the first job and (real farm) both big buttons are in the first screen.
test.use({ viewport: { width: 375, height: 812 } });

test('demo: «Κοπή σήμερα» and the first job are in the first screen', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  const cut = page.getByTestId('cut-today');
  await expect(cut).toBeVisible();
  const box = await cut.boundingBox();
  expect(box!.y + 60).toBeLessThan(812);
  await expect(page.getByTestId('cut').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('real farm: both big buttons are inside the first screen; a parcel without a planting says «Χωρίς φύτευση»', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  for (const id of ['spray-open', 'harvest-open']) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b!.y + b!.height).toBeLessThan(812);
  }
  await expect(page.getByTestId('wx-none')).toBeVisible(); // no weather yet: ONE line, no grid of dashes
  await expect(page.getByTestId('wx-day')).toHaveCount(0);
});
