import { expect, test } from './helpers/test';

test('spray groups and explicit selection fit at 320 px without picking a dose', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('spray-open').click();
  const choices = page.locator('.spray-choices').first();
  const first = choices.getByRole('button').first();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  expect((await first.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await expect(page.getByTestId('spray-dose')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
