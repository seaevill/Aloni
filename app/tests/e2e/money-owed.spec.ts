import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

// Ταμείο veresiye (is-2): a sale for a customer can be marked «Δεν πληρώθηκε ακόμα»; the unpaid card shows who owes; «Πληρώθηκε» clears it without changing the income.
test('Ταμείο: unpaid sale for a customer shows in the unpaid card; paying clears it and the income stays', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-customers').click();
  await page.getByTestId('customer-add').click();
  await page.getByTestId('customer-name').fill('Μαρία Παπά');
  await page.getByTestId('customer-save').click();
  await page.getByTestId('customers-back').click();
  await page.getByTestId('open-money').click();
  await expect(page.getByTestId('money-owed')).toHaveCount(0);
  const net = page.getByTestId('money-total').locator('.ds-bignum-value');
  await expect(net).toHaveText('292,60 €');

  await page.getByTestId('money-add-in').click();
  await page.getByTestId('money-amount').fill('100');
  await page.getByTestId('money-cat-sale').click();
  await page.getByTestId('money-owed-toggle').click();           // «not paid» without a customer: refused
  await page.getByTestId('money-save').click();
  await expect(page.getByTestId('money-error')).toBeVisible();
  await page.getByTestId('money-customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await page.getByTestId('money-save').click();
  await expect(net).toHaveText('392,60 €');                       // the sale is income at once
  await expect(page.getByTestId('money-owed')).toContainText('100,00');
  await expect(page.getByTestId('money-owed-line')).toContainText('Μαρία Παπά');

  await page.getByTestId('money-entry').filter({ hasText: '100,00' }).click();
  await page.getByTestId('money-settle').click();
  await expect(page.getByTestId('money-owed')).toHaveCount(0);
  await expect(net).toHaveText('392,60 €');                       // paying never writes a second income row
});
