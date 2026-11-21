import { expect, test } from '@playwright/test';

test('More prioritizes register and orders, with labelled targets at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  const links = page.getByTestId('more-menu').getByRole('button');
  await expect(links.first()).toHaveAttribute('data-testid', 'open-register');
  await expect(links.nth(1)).toHaveAttribute('data-testid', 'open-orders');
  await expect(links.nth(2)).toHaveAttribute('data-testid', 'open-worker-view');
  for (const link of await links.all()) expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await links.first().click();
  await expect(page.getByTestId('register-draft')).toBeVisible();
});
