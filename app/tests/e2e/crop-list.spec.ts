import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// R13 Φυτά list for people who do not like reading: a picture, the name and ONE chip per crop, at least six crops in the first screen; the plantings (field, area, waiting line, edit) are one tap away on the crop page.
test.use({ viewport: { width: 375, height: 812 } });
test('Demo Φυτά: picture + name + one chip per row, six rows in the first screen, plantings behind a tap', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Φυτά', exact: true })).toBeVisible();
  const rows = page.getByTestId('crop-open');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(5);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => rows.evaluateAll((items) => {
    const navTop = document.querySelector('nav.tabs')?.getBoundingClientRect().top ?? 0;
    return items.filter((item) => {
      const row = item.getBoundingClientRect();
      return row.top >= 0 && row.bottom <= navTop;
    }).length;
  })).toBeGreaterThanOrEqual(6);
  const first = rows.first();
  await expect(first.locator('svg[data-crop]')).toHaveCount(1);                               // the crop's picture
  await expect(first.locator('.ds-chip')).toHaveCount(1);                                     // ONE chip
  expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await expect(page.getByTestId('planting')).toHaveCount(0);                                  // no planting lines in the list
  await first.click();
  await expect(page.getByTestId('planting').first()).toBeVisible();                           // they are on the crop page
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
