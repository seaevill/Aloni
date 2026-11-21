import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('edit a parcel and a planting append-only: a reason is required, the new values show, the previous ones stay in the change history and on Ιστορικό', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('0,625');
  await page.getByTestId('parcel-save').click();

  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('parcel-edit').click();
  await page.locator('input.input').nth(1).fill('0,7');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('edit-reason-error')).toBeVisible();        // a change needs a reason
  await page.getByTestId('edit-reason').fill('μέτρηση ξανά');
  await page.getByTestId('parcel-save').click();
  const detail = page.getByTestId('parcel-detail');
  await expect(detail).toContainText('0,7 στρ.');
  await detail.getByText('Αλλαγές (1)').click();
  await expect(detail.getByTestId('edit-entry')).toContainText('μέτρηση ξανά');
  await expect(detail.getByTestId('edit-entry')).toContainText('εμβαδόν: 0,625 στρ.');   // the previous value is kept

  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').click();
  await expect(page.getByTestId('parcel-detail').getByText('Αλλαγές (1)')).toBeVisible();   // survives a reload

  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('planting-add').or(page.getByTestId('empty-state').locator('button').first()).first().click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.locator('input.input').nth(0).fill('0,25');
  await page.getByTestId('planting-save').click();
  await page.getByTestId('crop-open').first().click();
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

test('parcel detail (prototype): the facts, the boundary sketch or its absence, today\'s weather, plantings; back to the list', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('12');
  await page.getByTestId('parcel-osde').fill('ΟΣΔΕ-0001');
  await page.getByTestId('parcel-save').click();
  await page.getByTestId('parcel-open').click();
  const d = page.getByTestId('parcel-detail');
  await expect(d.getByRole('heading', { name: 'Κάτω Κάμπος' })).toBeVisible();
  await expect(d).toContainText('12 στρ.');
  await expect(d).toContainText('ΟΣΔΕ-0001');
  await expect(page.getByTestId('parcel-nosketch')).toBeVisible();                      // no boundary drawn yet
  await expect(page.getByTestId('detail-weather')).toContainText('Δεν υπάρχουν ακόμα δεδομένα καιρού');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('detail-back').click();
  await expect(page.getByTestId('parcel-open')).toBeVisible();
  expect(errors).toEqual([]);
});

test('crop detail (prototype): plantings of the crop and its last spraying with the waiting period; back to the list', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();               // the demo farm
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').first().click();
  const d = page.getByTestId('crop-detail');
  await expect(d).toBeVisible();
  await expect(d.getByTestId('detail-planting').first()).toBeVisible();
  await expect(d.getByTestId('detail-lastspray').or(d.getByTestId('detail-nospray'))).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('detail-back').click();
  await expect(page.getByTestId('crop-open').first()).toBeVisible();
  expect(errors).toEqual([]);
});
