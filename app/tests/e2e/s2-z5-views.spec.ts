import { expect, test } from '@playwright/test';
import { mountViewGallery } from './fixtures/z5-route';

test('the standalone views render on an isolated test route', async ({ page, baseURL }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mountViewGallery(page, baseURL!);
  await expect(page.getByTestId('harvest-heat').getByRole('cell').first()).toHaveText('12');
  await expect(page.getByTestId('harvest-heat').getByText('άγνωστο')).toBeVisible();
  await expect(page.getByTestId('month-ring').locator('[data-recorded="true"]')).toHaveCount(2);
  await expect(page.getByTestId('tips-card')).toContainText('Γενικές πληροφορίες – όχι σύσταση');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: testInfo.outputPath('crop-views-375.png'), fullPage: true });
});
