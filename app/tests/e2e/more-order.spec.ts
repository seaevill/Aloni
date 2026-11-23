import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('Άλλα: the daily work links come first (register, orders, customers, workers, weekly report), then photos and information', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  const ids = await page.getByTestId('more-menu').locator('button.row').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  const own = ids.filter((id) => ['open-register', 'open-orders', 'open-customers', 'open-workers', 'open-weekly-report', 'open-photos', 'open-info'].includes(String(id)));
  expect(own).toEqual(['open-register', 'open-orders', 'open-customers', 'open-workers', 'open-weekly-report', 'open-photos', 'open-info']);
  for (const id of own) expect((await page.getByTestId(String(id)).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
});
