import { expect, test } from './helpers/test';

test('Demo parcel overview shows labelled sketches and opens the matching detail at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  const tiles = page.getByTestId('parcel-sketch-open');
  await expect(tiles).toHaveCount(5);
  await expect(tiles.locator('svg[data-shape="rect"]')).toHaveCount(3);
  await expect(tiles.locator('svg[data-shape="poly"]')).toHaveCount(2);
  await expect(tiles.first().getByTestId('parcel-sketch-status')).not.toBeEmpty();
  for (const tile of await tiles.all()) expect((await tile.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await tiles.filter({ hasText: 'Κάτω Κάμπος' }).click();
  const detail = page.getByTestId('parcel-detail');
  await expect(detail.getByRole('heading', { name: 'Κάτω Κάμπος', exact: true })).toBeVisible();
  await expect(detail.getByTestId('parcel-sketch')).toHaveAttribute('data-shape', 'rect');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
