import { expect, test } from '@playwright/test';

test('crop page has a «Συμβουλές» button opening the sourced general-information card', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();

  const button = page.getByTestId('crop-tips-open');
  await expect(button).toHaveText(/Συμβουλές/);
  expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await button.click();

  const card = page.getByTestId('crop-tips');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Γενικές πληροφορίες – όχι σύσταση');
  await expect(card).toContainText('Τρυφερά φύλλα');
  await expect(card).toContainText('Περονόσπορος');
  await expect(card.getByTestId('crop-tips-fact')).toHaveCount(3);
  await expect(card).not.toContainText(/ασφαλ/i);
  // R14: a ring of the months this crop was SOWN on the farm (recorded plantings), and the lightbulb on the button
  await expect(button.locator('svg')).toHaveCount(1);
  const ring = card.getByTestId('crop-tips-ring');
  await expect(ring).toBeVisible();
  expect(Number(await ring.getAttribute('data-count'))).toBeGreaterThan(0);
  await expect(card.getByTestId('crop-tips-ring-block')).toContainText('Μήνες σποράς');
});
