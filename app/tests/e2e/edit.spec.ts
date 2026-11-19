import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('edit a parcel and a planting append-only: a reason is required, the new values show, the previous ones stay in the change history and on Ιστορικό', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('0,625');
  await page.getByTestId('parcel-save').click();

  await page.getByTestId('parcel-edit').click();
  await page.locator('input.input').nth(1).fill('0,7');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('edit-reason-error')).toBeVisible();        // a change needs a reason
  await page.getByTestId('edit-reason').fill('μέτρηση ξανά');
  await page.getByTestId('parcel-save').click();
  const card = page.locator('main .card').first();
  await expect(card).toContainText('0,7 στρ.');
  await card.getByText('Αλλαγές (1)').click();
  await expect(card.getByTestId('edit-entry')).toContainText('μέτρηση ξανά');
  await expect(card.getByTestId('edit-entry')).toContainText('εμβαδόν: 0,625 στρ.');   // the previous value is kept

  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('main .card').first().getByText('Αλλαγές (1)')).toBeVisible();   // survives a reload

  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('planting-add').or(page.getByTestId('empty-state').locator('button').first()).first().click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.locator('input.input').nth(0).fill('0,25');
  await page.getByTestId('planting-save').click();
  await page.getByTestId('planting-edit').click();
  await expect(page.getByRole('button', { name: 'Σπανάκι' })).toHaveCount(0);           // the crop and the parcel do not change: a different one is a new planting
  await page.locator('input.input').nth(0).fill('0,3');
  await page.getByTestId('planting-save').click();
  await expect(page.getByTestId('edit-reason-error')).toBeVisible();
  await page.getByTestId('edit-reason').fill('διόρθωση εμβαδού');
  await page.getByTestId('planting-save').click();
  await expect(page.getByTestId('planting')).toContainText('0,3 στρ.');
  await page.getByTestId('planting').getByText('Αλλαγές (1)').click();
  await expect(page.getByTestId('edit-entry')).toContainText('εμβαδόν: 0,25 στρ.');
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('history-open').click();
  await expect(page.getByTestId('history-edited')).toHaveCount(2);                      // the parcel and the planting, with their histories
  expect(errors).toEqual([]);
});
