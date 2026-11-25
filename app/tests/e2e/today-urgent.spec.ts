import { expect, test } from '@playwright/test';

// Σήμερα › the most important card: its button opens the explanation of THAT waiting period (not the generic history), and says why it is unknown.
test('the urgent card opens the wait explanation of its own planting', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('urgent')).toContainText('Άγνωστη αναμονή');
  await expect(page.getByTestId('urgent-action')).toHaveText('Δείτε γιατί');
  await page.getByTestId('urgent-action').click();
  const sheet = page.getByTestId('sheet-wait');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-why')).toContainText('Λείπει υπογεγραμμένη ετικέτα');   // it says WHY the waiting period is unknown
  await expect(page.getByTestId('history')).toHaveCount(0);                            // not the generic history screen
  expect(await page.evaluate(() => location.hash)).toContain('/sheet/wait/');
});
