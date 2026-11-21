import { expect, test } from '@playwright/test';

test('the detail offers a 14-day parcel weather panel', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();

  const spinach = page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' });
  await spinach.click();
  const detail = page.getByTestId('crop-detail');
  await expect(detail.getByTestId('detail-planting')).toHaveCount(2);
  const weather = detail.getByTestId('crop-weather').first();
  await expect(weather.getByTestId('crop-weather-day')).toHaveCount(14);
  await expect(weather.getByTestId('crop-weather-day').first()).toContainText('°');
  await expect(weather.getByTestId('crop-weather-day').last()).toContainText('—');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
