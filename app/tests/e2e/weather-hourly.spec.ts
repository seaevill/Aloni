import { expect, test } from './helpers/test';

test.use({ viewport: { width: 375, height: 812 } });

test('Demo weather sheet: today by the hour (fictional, labelled), temperatures between the day\'s lowest and highest', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('weather-strip').click();
  const sheet = page.getByTestId('sheet-weather');
  await expect(sheet.getByTestId('weather-hour')).toHaveCount(6);
  await expect(sheet.getByTestId('weather-hourly-demo')).toContainText('δεδομένα επίδειξης');
  await expect(sheet.getByTestId('weather-hour').first()).toContainText('06:00');
  await expect(sheet.getByTestId('weather-hour').first()).toContainText('°');
});
