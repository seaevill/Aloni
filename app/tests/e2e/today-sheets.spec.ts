import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Σήμερα: every number and card opens a sheet that says where it comes from. Unknown is written with its reason (never blank, never 0); the sheets add up to the numbers.
test.use({ viewport: { width: 375, height: 812 } });

test('demo: the 7-day number opens the table that adds up to it; the same numbers as the screen', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-cut7-big')).toBeVisible();
  await expect(page.getByTestId('today-cut7-big').locator('.ds-bignum-value')).toHaveText(/\d/);          // the harvest rows load after the tile first shows: wait for the number (the Demo always has crates in the last 7 days)
  const kpi = Number((await page.getByTestId('today-cut7-big').locator('.ds-bignum-value').innerText()).replace(/\D/g, ''));
  await page.getByTestId('today-cut7-big').click();
  const sheet = page.getByTestId('sheet-crates');
  await expect(sheet).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/\/sheet\/crates\/7$/);
  const total = Number((await sheet.locator('.ds-bignum-value').innerText()).replace(/\D/g, ''));
  expect(total).toBe(kpi);                                                                  // the sheet's total IS the screen's number
  const rows = await sheet.locator('.ds-row-trailing strong').allInnerTexts();
  expect(rows.map((r) => Number(r.replace(/\D/g, ''))).reduce((a, b) => a + b, 0)).toBe(total);   // and the rows add up to it
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
  await page.getByTestId('today-cut28').click();
  await expect(page.getByTestId('sheet-crates')).toContainText('28');
  await page.getByTestId('sheet-close').click();
  expect(errors).toEqual([]);
});

test('Χωράφια / Καλλιέργειες / the two big numbers each open their list; a crop row opens the crop sheet with plantings, today and logged crates, and the target reason', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.getByTestId('kpi-parcels').click();
  await expect(page.getByTestId('sheet-parcels').locator('.ds-row')).toHaveCount(5);          // the Demo farm has five parcels
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('kpi-crops').click();
  const crops = page.getByTestId('sheet-crops');
  await expect(crops).toBeVisible();
  await crops.locator('button.ds-row').first().click();                                      // a crop row opens the crop sheet
  const crop = page.getByTestId('sheet-crop');
  await expect(crop).toBeVisible();
  await expect(crop.locator('.ds-fact')).toHaveCount(3);
  await expect(crop).toContainText('Στόχος σεζόν');
  await expect(crop).toContainText('δεν έχει οριστεί στόχος');                               // the target is unknown, WITH its reason
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('num-cut').click();
  await expect(page.getByTestId('sheet-cut')).toBeVisible();
  await expect(page.getByTestId('sheet-cut').locator('h3').first()).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('today-cut7-big').click();
  await expect(page.getByTestId('sheet-crates')).toBeVisible();
});

test('real farm with nothing logged: the sheet says WHY the total is unknown (not zero); a cut card opens its crop', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('today-cut7-big').click();
  const sheet = page.getByTestId('sheet-crates');
  await expect(sheet.locator('.ds-bignum-value')).toHaveText('άγνωστο');
  await expect(sheet.getByTestId('sheet-why')).toContainText('Το σύνολο δεν είναι μηδέν');
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('cut').first().click();
  await expect(page.getByTestId('sheet-crop')).toBeVisible();
  await expect(page.getByTestId('sheet-crop')).toContainText('δεν έχει καταγραφεί');
  await page.getByTestId('sheet-close').click();
});

test('a sheet address survives a reload: the same sheet comes back', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.getByTestId('kpi-parcels').click();
  await expect(page.getByTestId('sheet-parcels')).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/parcels/all');
  await page.reload();
  await expect(page.getByTestId('sheet-parcels')).toBeVisible();
});
