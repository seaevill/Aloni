import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('the spray register (demo): marked «ΠΡΟΣΧΕΔΙΟ», every field, CSV with the draft notice, printable, no sideways scroll at 375 px', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-register').click();
  await expect(page.getByTestId('register-draft')).toContainText('ΠΡΟΣΧΕΔΙΟ');
  await expect(page.getByTestId('register-line').first()).toBeVisible();
  expect(await page.getByTestId('register-line').count()).toBeGreaterThanOrEqual(7);
  await expect(page.getByTestId('register-line').first()).toContainText('Ψέκασε');
  await expect(page.getByTestId('register-line').first()).toContainText('Εμβαδόν');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const download = page.waitForEvent('download');
  await page.getByTestId('register-csv').click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/^aloni-demo-psekasmoi-prosxedio-\d{4}-\d{2}-\d{2}\.csv$/);
  const path = test.info().outputPath('r.csv'); await d.saveAs(path);
  const csv = readFileSync(path, 'utf8').split('\r\n');
  expect(csv[0]).toContain('ΠΡΟΣΧΕΔΙΟ');
  expect(csv[1]).toContain('Ημερομηνία και ώρα');
  expect(csv.length).toBeGreaterThan(8);
  await page.emulateMedia({ media: 'print' }); // the print view hides the buttons and the tab bar
  await expect(page.getByTestId('register-csv')).toBeHidden();
  await expect(page.locator('nav.tabs')).toBeHidden();
  expect(errors).toEqual([]);
});
