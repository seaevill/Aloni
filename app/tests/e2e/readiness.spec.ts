import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('sign-in readiness: lists what is missing, never switches anything on, and says ready only when all five are done', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('dev-section').locator('summary').click();
  const box = page.locator('[data-testid^="readiness"]');
  await expect(box.first()).toBeVisible();
  await expect(box.locator('[data-ok="no"]')).toHaveCount(5);
  await expect(page.getByTestId('ready-summary')).toContainText('Λείπουν 5');
  await page.getByTestId('ready-farm-input').fill('Κτήμα Δοκιμής');
  await page.getByTestId('ready-farm-set').click();
  await page.getByTestId('ready-migration-confirm').click();
  await page.getByTestId('ready-advisor-confirm').click();
  await expect(box.locator('[data-ok="no"]')).toHaveCount(2);               // controller and tax number are entered elsewhere
  await expect(page.getByTestId('ready-summary')).toContainText('Λείπουν 2');
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('ready-farm_name')).toHaveAttribute('data-ok', 'yes');   // kept after a reload
  await expect(page.getByTestId('sign-in')).toHaveCount(0);                             // and nothing was switched on
  expect(errors).toEqual([]);
});
