import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('worker harvest: every planting chip carries its crop picture before the name', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-tab-harvest').click();
  const chips = page.getByTestId('harvest-chip');
  await expect(chips.first()).toBeVisible();
  const n = await chips.count();
  expect(n).toBeGreaterThan(2);
  await expect(page.locator('[data-testid="harvest-chip"] svg')).toHaveCount(n);
  expect((await chips.first().boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
});
