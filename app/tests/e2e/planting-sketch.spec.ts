import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('Demo: the parcel sketch shows its plantings (illustrative), a planting row opens the crop card, the crop page highlights its own strip', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-sketch-open').first().click();
  const detail = page.getByTestId('parcel-detail');
  await expect(detail.getByTestId('sketch-mark').first()).toBeVisible();
  await expect(detail.getByTestId('sketch-note')).toContainText('Ενδεικτικό σχέδιο');
  const marks = await detail.getByTestId('sketch-mark').count();
  expect(marks).toBe(await detail.getByTestId('detail-planting').count());
  await detail.getByTestId('detail-planting').first().click();
  await expect(page.getByTestId('sheet-crop')).toBeVisible();
  await page.getByTestId('sheet-close').click();

  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  const sketch = page.getByTestId('crop-detail').getByTestId('crop-sketch').first();
  await expect(sketch.locator('.sketch-mark.on')).toHaveCount(1);
});
