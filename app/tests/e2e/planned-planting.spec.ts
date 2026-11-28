import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { iphone } from './helpers/iphone';

// ev-1: a planting that is only planned («Προγραμματισμένη») is not sown yet: the cards do not call it ready to cut, and the harvest form does not let it be picked.
test('a planned-only planting says «Προγραμματισμένη» on both cards and cannot be picked for a harvest (375 px)', async ({ page }) => {
  const errors = await iphone(page);
  await goTab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('main input.input').nth(0).fill('Κάτω Κάμπος'); await page.locator('main input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('parcel-save')).toBeHidden();
  await goTab(page, 'crops');
  await page.getByTestId('empty-state').locator('button').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click(); await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.locator('main input.input').nth(0).fill('0,25');
  await page.getByRole('button', { name: 'Προγραμματισμένη' }).click();
  await page.getByTestId('planting-save').click();
  await expect(page.getByTestId('planting-save')).toBeHidden();
  await goTab(page, 'parcels');
  await expect(page.getByTestId('parcel-wait').first()).toContainText('Προγραμματισμένη');
  await expect(page.getByTestId('parcel-sketch-status').first()).toContainText('Προγραμματισμένη');
  await expect(page.getByTestId('parcel-sketch-status').first()).not.toContainText('Έτοιμο για κοπή');
  await goTab(page, 'crops');
  await expect(page.getByTestId('crop-open').first().locator('.ds-chip')).toContainText('Προγραμματισμένη');
  await expect(page.getByTestId('crop-open').first().locator('.ds-chip')).not.toContainText('Έτοιμο για κοπή');
  await goTab(page, 'today');
  await page.getByTestId('harvest-open').click();
  const chip = page.getByTestId('harvest-chip').first();
  await expect(chip).toBeDisabled();
  await expect(chip).toContainText('Προγραμματισμένη');
  expect(errors).toEqual([]);
});
