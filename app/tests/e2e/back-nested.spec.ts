import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test.use({ viewport: { width: 375, height: 812 } });

async function openProductFromHistory(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('history-open').click();
  await page.getByTestId('spray-product-open').first().click();
  await expect(page.getByTestId('product-source')).toBeVisible();
}

test('closing a sheet with its ✕ leaves the screen under it open (Ιστορικό stays)', async ({ page }) => {
  await openProductFromHistory(page);
  await page.getByTestId('product-source').getByTestId('sheet-close').click();
  await expect(page.getByTestId('product-source')).toHaveCount(0);
  await expect(page.getByTestId('history')).toBeVisible();
});

test('the Back gesture closes only the sheet, a second Back closes Ιστορικό', async ({ page }) => {
  await openProductFromHistory(page);
  await page.goBack();
  await expect(page.getByTestId('product-source')).toHaveCount(0);
  await expect(page.getByTestId('history')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('history')).toHaveCount(0);
  await expect(page.getByTestId('today-counts')).toBeVisible();
});
