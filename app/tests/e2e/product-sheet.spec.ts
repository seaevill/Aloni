import { expect, test } from './helpers/test';
import { fixClock } from './helpers/clock';

test('a spray in Ιστορικό opens the product page: label purpose, active substance, waits, stock, general card, no advice', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('history-open').click();
  const open = page.getByTestId('spray-product-open').first();
  await expect(open).toBeVisible();
  expect((await open.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await open.click();

  const sheet = page.getByTestId('product-source');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('product-purpose')).toBeVisible();
  await expect(sheet.getByTestId('product-general')).toContainText('Γενικές πληροφορίες – όχι σύσταση');
  await expect(sheet.getByTestId('product-stock')).toBeVisible();
  await expect(sheet.getByTestId('product-link')).toBeVisible();
  await expect(sheet).not.toContainText(/ασφαλ/i);
  await expect(sheet).not.toContainText(/δοσολογ|συνιστ/i);
});
