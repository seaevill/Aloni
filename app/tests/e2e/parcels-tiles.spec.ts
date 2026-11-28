import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Χωράφια (is-10): ONE list. Each field card carries its sketch, the SHORT state chip (the same three words as the crop chips), the names of the crops sown on it and the full wait sentence; nothing is removed and the card opens its field. The separate tile grid is gone.
test('Demo Χωράφια (375 px): one card per field with sketch, state chip, crop names and the full wait sentence; it opens the field', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  const tiles = page.getByTestId('parcel-open');
  const rows = page.getByTestId('parcel-wait');
  await expect(page.getByTestId('parcel-sketch-overview')).toHaveCount(0);
  await expect(page.getByTestId('parcel-sketch-open')).toHaveCount(0);
  await expect(tiles).toHaveCount(5);
  await expect(rows).toHaveCount(5);
  await expect(tiles.getByTestId('parcel-sketch')).toHaveCount(5);
  const crops = await tiles.getByTestId('parcel-crops').allInnerTexts();
  expect(crops.length).toBeGreaterThan(0);
  for (const text of crops) expect(text.trim()).not.toBe('');
  for (const text of await tiles.getByTestId('parcel-sketch-status').allInnerTexts()) expect(text).toMatch(/^(Έτοιμο για κοπή|Σε αναμονή|Άγνωστη αναμονή)$/);
  for (const text of await rows.allInnerTexts()) expect(text).toMatch(/^(Τελευταίος ψεκασμός|Χωρίς ψεκασμό)/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await tiles.first().evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByTestId('parcel-detail')).toBeVisible();
});
