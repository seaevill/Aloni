import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('the Demo moves with the real today: on another day it still has crates in the last 7 days and an open job on the board', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-05T10:00:00Z'));          // 19 days after the prototype's own «today»
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('today-cut7').click();
  const sheet = page.getByTestId('sheet-crates');
  await expect(sheet.getByTestId('sheet-why')).toHaveCount(0);               // not «άγνωστο»: there are logged harvests in the window
  await sheet.getByTestId('sheet-close').click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-free-job')).toHaveCount(1);
});
