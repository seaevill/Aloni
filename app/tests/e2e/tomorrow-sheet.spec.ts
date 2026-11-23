import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('a «Αύριο φεύγουν» row opens who orders it (per customer), what the store holds against it, and a text to copy for the driver', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-customers').click();
  await page.getByTestId('customer-add').click();
  await page.getByTestId('customer-name').fill('Μαρία Παπά');
  await page.getByTestId('customer-save').click();
  await page.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await page.getByTestId('order-crop-parsley').click();
  await page.getByTestId('order-crates').fill('12');
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-saved')).toBeVisible();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('tomorrow-open').filter({ hasText: 'Μαϊντανός' }).click();
  const sheet = page.getByTestId('tomorrow-sheet');
  const mine = sheet.getByTestId('tomorrow-customer').filter({ hasText: 'Μαρία Παπά' });
  await expect(mine).toContainText('12');
  await expect(sheet.getByTestId('tomorrow-store')).toContainText('αποθήκη');
  await expect(sheet.getByTestId('tomorrow-copy')).toBeVisible();
  expect((await sheet.getByTestId('tomorrow-copy').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  // «Φορτώθηκε»: confirming a customer's load takes it off the store; it survives closing and reopening; a second tap undoes it
  const loaded = mine.locator('xpath=..').getByTestId('tomorrow-loaded');
  await expect(loaded).toHaveText('Φορτώθηκε');
  await loaded.click();
  await expect(loaded).toContainText('Φορτώθηκε ✓');
  await sheet.getByTestId('sheet-close').click();
  await page.getByTestId('tomorrow-open').filter({ hasText: 'Μαϊντανός' }).click();
  await expect(page.getByTestId('tomorrow-sheet').getByTestId('tomorrow-customer').filter({ hasText: 'Μαρία Παπά' }).locator('xpath=..').getByTestId('tomorrow-loaded')).toContainText('Φορτώθηκε ✓');
  await page.getByTestId('tomorrow-sheet').getByTestId('tomorrow-customer').filter({ hasText: 'Μαρία Παπά' }).locator('xpath=..').getByTestId('tomorrow-loaded').click();
  await expect(page.getByTestId('tomorrow-sheet').getByTestId('tomorrow-customer').filter({ hasText: 'Μαρία Παπά' }).locator('xpath=..').getByTestId('tomorrow-loaded')).toHaveText('Φορτώθηκε');
});
