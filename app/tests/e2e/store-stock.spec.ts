import { expect, test } from '@playwright/test';
import { openStock } from './helpers/tabs';

test.use({ viewport: { width: 375, height: 812 } });

test('Demo: Αποθήκη starts with the harvest in store (crop, crates, age) and a row opens the store / direct dispatch split', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await openStock(page);
  const section = page.getByTestId('store-stock');
  await expect(section).toBeVisible();
  const row = section.getByTestId('store-row').first();
  await expect(row).toContainText('κλούβ');
  await expect(row.getByTestId('store-age')).toBeVisible();
  await expect(section.getByTestId('store-tomorrow')).toContainText('Αύριο φεύγουν');
  await row.click();
  const sheet = page.getByTestId('store-sheet');
  await expect(sheet.getByTestId('store-split-store')).toContainText('Αποθήκη');
  await expect(sheet.getByTestId('store-split-dispatch')).toContainText('Απευθείας φόρτωση');
  await expect(sheet.getByTestId('store-split-unknown')).toContainText('άγνωστο – παλιά καταγραφή');
});
