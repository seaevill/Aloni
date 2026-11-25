import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Χωράφια: the sketch tiles carry the SHORT state (the same three words as the crop chips); the full sentence (last spray, when cutting is possible) stays on the row below, nothing is removed, every tile and row still opens its field.
test('Demo Χωράφια (375 px): each tile has a state chip, each row still has the full wait sentence, both open the field', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  const tiles = page.getByTestId('parcel-sketch-open');
  const rows = page.getByTestId('parcel-wait');
  await expect(tiles).toHaveCount(5);
  await expect(rows).toHaveCount(5);
  for (const text of await tiles.getByTestId('parcel-sketch-status').allInnerTexts()) expect(text).toMatch(/^(Έτοιμο για κοπή|Σε αναμονή|Άγνωστη αναμονή)$/);
  for (const text of await rows.allInnerTexts()) expect(text).toMatch(/^(Τελευταίος ψεκασμός|Χωρίς ψεκασμό)/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await tiles.first().evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByTestId('parcel-detail')).toBeVisible();
});
