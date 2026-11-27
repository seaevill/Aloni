import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { iphone } from './helpers/iphone';

// T17b: an absurd area is refused with a reason; with only one parcel the planting form has it preselected.
test('area 99999999999 is refused; a planting form with one parcel has it chosen', async ({ page }) => {
  const errors = await iphone(page);
  const tab = (id: string) => goTab(page, id);
  await tab('parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('main input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('main input.input').nth(1).fill('99999999999');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByRole('alert').filter({ hasText: 'δεν φαίνεται σωστό' })).toBeVisible();
  await page.locator('main input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await tab('crops');
  await page.getByTestId('empty-state').locator('button').first().click().catch(() => undefined);
  const chosen = page.locator('main .seg button[aria-pressed="true"]');
  await expect(chosen.filter({ hasText: 'Κάτω Κάμπος' })).toHaveCount(1);
  expect(errors).toEqual([]);
});
