import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('Demo lot details show the recorded ledger with no adjustment action', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId('stock-open').click();
  const open = page.getByTestId('lot-detail-open').first();
  await expect(open).toHaveAccessibleName('Κινήσεις παρτίδας');
  expect((await open.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await open.click();
  const detail = page.getByTestId('lot-detail');
  await expect(detail.getByTestId('lot-detail-movement').first()).toBeVisible();
  await expect(detail.getByTestId('adjust-open')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await detail.getByRole('button', { name: 'Επιστροφή' }).click();
  await expect(page.getByTestId('lot').first()).toBeVisible();
});
