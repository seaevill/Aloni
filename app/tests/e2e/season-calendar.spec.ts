import { expect, test } from '@playwright/test';

test('opens a Greek twelve-month calendar for the Demo farm from Φυτά', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('season-calendar-open').click();
  const calendar = page.getByTestId('season-calendar');
  const months = calendar.getByTestId('season-month');
  await expect(months).toHaveCount(12);
  await expect(months.first()).toContainText('Ιανουάριος');
  await expect(months.last()).toContainText('Δεκέμβριος');
  await expect(calendar).toContainText(/Σπορές · [1-9]/);
  await expect(calendar).toContainText('δεν υπάρχει πηγή');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const evidence = process.env.N23_SEASON_EVIDENCE;
  if (evidence) await page.screenshot({ path: evidence, animations: 'disabled' });
});
