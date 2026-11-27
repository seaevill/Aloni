import { expect, test } from '@playwright/test';
import { openStock } from './helpers/tabs';

test.use({ viewport: { width: 375, height: 812 } });

test('Αποθήκη: every product card has its own «ⓘ» button (≥56 px) that opens that product\'s information', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await openStock(page);
  const cards = page.getByTestId('product');
  await expect(cards.first()).toBeVisible();
  const n = await cards.count();
  expect(n).toBeGreaterThan(1);
  await expect(page.getByTestId('product-info')).toHaveCount(n);
  const first = page.getByTestId('product-info').first();
  expect((await first.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  const name = (await cards.first().locator('strong').first().innerText()).trim();
  await first.click();
  await expect(page.getByTestId('product-source')).toContainText(name);
  await expect(page.getByTestId('product-general')).toBeVisible();
});
