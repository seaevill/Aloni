import { expect, test } from '@playwright/test';
import { setup, closeHistory } from './helpers/farm';
import { iphone } from './helpers/iphone';

test('Back closes the open parcel and stays in the app on the Χωράφια list', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('parcel-detail')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (history.state as { aloni?: number } | null)?.aloni)).toBe(1);   // the history entry of the open parcel exists
  await page.goBack();
  await expect(page.getByTestId('parcel-open').first()).toBeVisible();
  expect(page.url()).toContain('#/own/parcels');                                    // still in the app, on the list
  expect(errors).toEqual([]);
});

test('the demo farm and the tab survive a reload (with the demo banner); the own farm is one tap away', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();           // the demo farm
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await expect(page.getByTestId('demo-banner').first()).toBeVisible();
  await page.reload();
  expect(page.url()).toContain('#/demo/stock');
  await expect(page.locator('nav.tabs [data-tab="stock"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('demo-banner').first()).toBeVisible();
});

test('a form with something typed asks before Back leaves it; staying keeps the form', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();         // something chosen = something unsaved
  await page.goBack();
  await expect(page.getByTestId('leave-ask')).toBeVisible();
  await page.getByTestId('leave-stay').click();
  await expect(page.getByTestId('spray-save')).toBeVisible();                        // the form is still there
  await page.goBack();
  await page.getByTestId('leave-go').click();
  await expect(page.getByTestId('spray-save')).toHaveCount(0);
  await expect(page.getByTestId('spray-open')).toBeVisible();
});

test('an empty Σήμερα opens the parcel form in ONE tap; tapping the active tab again returns to its list', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').first().click();
  await expect(page.getByTestId('parcel-save')).toBeVisible();
  await page.getByTestId('parcel-save').scrollIntoViewIfNeeded();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος'); await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('parcel-detail')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();                        // the active tab again
  await expect(page.getByTestId('parcel-open').first()).toBeVisible();
});
