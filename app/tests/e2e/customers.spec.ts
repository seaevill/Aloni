import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('Άλλα → Πελάτες: add a customer, type an order for tomorrow, see it on the customer page and in «Αύριο φεύγουν»', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-customers').click();
  await expect(page.getByTestId('customers')).toBeVisible();                       // (the Demo already lists the Κλούβες clients under «από Κλούβες»)
  await page.getByTestId('customer-add').click();
  await page.getByTestId('customer-save').click();
  await expect(page.getByTestId('customer-name-error')).toBeVisible();
  await page.getByTestId('customer-name').fill('Μαρία Παπά');
  await page.getByTestId('customer-phone').fill('6900000000');
  await page.getByTestId('customer-save').click();
  await page.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await expect(page.getByTestId('customer-phone-line')).toHaveText('6900000000');
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-saved')).toHaveCount(0);
  await page.getByTestId('order-crop-parsley').click();
  await page.getByTestId('order-crates').fill('2,5');
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-error')).toBeVisible();
  await page.getByTestId('order-crates').fill('12');
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-saved')).toBeVisible();
  await expect(page.getByTestId('customer-order')).toContainText('12 κλούβες');
  await page.getByTestId('customer-back').click();
  await expect(page.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' })).toContainText('Αυτή την εβδομάδα: 12 κλούβες');       // per customer, this week
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('tomorrow-row').filter({ hasText: 'Μαϊντανός' })).toBeVisible();
});
