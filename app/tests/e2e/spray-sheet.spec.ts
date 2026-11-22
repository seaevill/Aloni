import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { openHistory, setup, spray } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

test('a spray in Ιστορικό opens its process: product, date, dose as recorded, wait ring, cut-from and re-entry end', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toBeVisible();
  await openHistory(page);
  const open = page.getByTestId('spray-detail-open').first();
  expect((await open.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await open.click();
  const sheet = page.getByTestId('spray-sheet');
  await expect(sheet).toContainText('Kocide 2000');
  await expect(sheet.getByTestId('spray-sheet-dose')).toContainText('0,025');
  await expect(sheet.getByTestId('spray-sheet-dose')).toContainText('ml/στρ.');
  await expect(sheet.getByTestId('wait-ring')).toBeVisible();
  await expect(sheet.getByTestId('spray-sheet-cutfrom')).toContainText('Κοπή από');
  await expect(sheet.getByTestId('spray-sheet-reentry')).toContainText('Επανείσοδος από');
  await expect(sheet.getByTestId('spray-sheet-product')).toBeVisible();
  await expect(sheet).not.toContainText(/ασφαλ/i);
});
