import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

test('the demo farm fills every screen, read-only, in Greek at 375 px without overflow, and no write button appears', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click(); // the second choice on a first start: load the demo
  const noSideways = async (at: string) => expect(await page.evaluate(() => document.documentElement.scrollWidth), at).toBeLessThanOrEqual(375);

  await expect(page.getByTestId('today-counts')).toBeVisible();
  await expect(page.getByTestId('spray').first()).toBeVisible();
  expect(await page.getByTestId('spray').count()).toBeGreaterThan(3);
  await expect(page.getByTestId('spray-phi-unknown').first()).toBeVisible(); // some sprays have an unknown waiting period
  await expect(page.getByTestId('spray-phi').first()).toBeVisible(); // some have a known one
  await expect(page.getByTestId('harvest').first()).toBeVisible();
  expect(await page.getByTestId('harvest').count()).toBeGreaterThan(3);
  await expect(page.getByTestId('spray-open')).toHaveCount(0);
  await expect(page.getByTestId('wait-open')).toHaveCount(0);
  await noSideways('today');

  await tab(page, 'stock');
  await expect(page.getByTestId('product').first()).toBeVisible();
  expect(await page.getByTestId('product').count()).toBeGreaterThan(10);
  await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId('labeluse-open').click(); // copper: five label uses, all three states
  await expect(page.getByTestId('labeluse-add')).toHaveCount(0);
  await expect(page.getByTestId('labeluse-status').first()).toBeVisible();
  const statuses = await page.getByTestId('labeluse-status').allTextContents();
  expect(statuses.some((s) => s.includes('Υπογραφή γεωπόνου:'))).toBe(true);
  expect(statuses.some((s) => s.includes('Χωρίς υπογραφή γεωπόνου'))).toBe(true);
  expect(statuses.some((s) => s.includes('ΑΠΟΚΛΕΙΣΜΕΝΟ'))).toBe(true);
  await noSideways('label uses');
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId('stock-open').click();
  await expect(page.getByTestId('lot').first()).toBeVisible();
  await expect(page.getByTestId('receive-open')).toHaveCount(0);
  await noSideways('lots');
  await tab(page, 'parcels');
  await page.getByTestId('analysis-open').first().click();
  await expect(page.getByTestId('analysis').first()).toContainText('pH');
  await expect(page.getByTestId('analysis-add-soil')).toHaveCount(0);
  await noSideways('analyses');
  await tab(page, 'more');
  await page.getByTestId('open-workers').click();
  await expect(page.getByTestId('worker')).toHaveCount(3);
  await noSideways('workers');
  expect(errors).toEqual([]);
});
