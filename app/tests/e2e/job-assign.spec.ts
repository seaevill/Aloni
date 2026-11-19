import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// The owner plans a spray for a worker on the REAL farm: everything the worker will do is fixed here (plantings, product, the signed label use, dose, unit, who, day).
test('the owner assigns a spray job to a worker: label offered, saved as a planned job, listed on Σήμερα, kept after a reload; incomplete input is refused', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.getByTestId('job-open').click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-error')).toBeVisible();      // nothing chosen: refused, with the reason
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await expect(page.getByTestId('job-label')).toContainText('Υπογραφή γεωπόνου: Test Agronomist'); // the signed label use is shown
  await expect(page.getByTestId('job-dose')).toHaveValue('0,025');          // the label's own single dose is offered as a start
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-saved')).toBeVisible();
  await expect(page.getByTestId('job-planned')).toHaveCount(1);
  await expect(page.getByTestId('job-planned')).toContainText('Kocide 2000');
  await expect(page.getByTestId('job-planned')).toContainText('Γιώργος');
  await page.reload();
  await expect(page.getByTestId('job-planned')).toHaveCount(1);
  expect(errors).toEqual([]);
});
