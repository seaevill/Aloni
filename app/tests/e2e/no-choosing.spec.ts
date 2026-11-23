import { expect, test } from './helpers/test';
import { setup, closeHistory, fillStart } from './helpers/farm';
import { iphone } from './helpers/iphone';

// a safety test is never retried: a failure that comes and goes is a real race, not noise (see playwright.config.ts)
test.describe.configure({ retries: 0 });

// T6: the app never chooses for the owner — no dose is filled in, a quantity is typed or flagged «Δεν ξέρω», a spray cannot be PLANNED for a crop without label data.
test('the dose stays empty until the owner taps «Ίδια με την ετικέτα»; an unknown quantity is flagged; a hint shows the total as text only', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await expect(page.getByTestId('spray-dose')).toHaveValue('');                       // nothing filled in
  await expect(page.getByTestId('spray-label-dose')).toContainText('0,025');          // the label's dose is shown beside the field
  await page.getByTestId('spray-dose-same').click();
  await expect(page.getByTestId('spray-dose')).toHaveValue('0,025');                  // the exact label string, no rounding
  await expect(page.getByTestId('spray-total-hint')).toContainText('0,25 στρ. × 0,025 ml = 0,00625 ml');   // text only: the field above is unchanged
  await expect(page.getByTestId('spray-dose')).toHaveValue('0,025');
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await fillStart(page);
  await page.getByTestId('spray-save').click();                                       // the only lot is preselected: its quantity is missing and «Δεν ξέρω» is not ticked
  await expect(page.locator('.msg.error').first()).toBeFocused();
  await page.getByTestId('spray-qty-unknown').check();
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a job for a product with no label data for the crop is refused: «Δεν μπορείτε να αναθέσετε»', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.locator('main').getByRole('button', { name: 'Προσθήκη προϊόντος' }).click();
  await page.locator('input.input').nth(0).fill('Score 25');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click(); await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('job-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Score 25' }).click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('job-dose').fill('0,1');
  await page.getByRole('button', { name: 'ml/στρ.', exact: true }).click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-nolabel')).toContainText('Δεν μπορείτε να αναθέσετε');
  await expect(page.getByTestId('job-saved')).toHaveCount(0);
});
