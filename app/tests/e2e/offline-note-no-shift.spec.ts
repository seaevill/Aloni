import { expect, test } from '@playwright/test';

// The «ready offline» note appears when the service worker finishes, a moment nobody chose. It must float over the screen: the content under a finger that is already on its way must not move
// (CI 2026-11-23: a tap meant for «Φόρτωση επίδειξης» landed on the empty area next to it), and it goes away by itself.
test('the «ready offline» note floats, moves nothing, takes no taps and goes away by itself', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  const button = page.getByTestId('empty-second');
  const before = await button.boundingBox();
  await page.evaluate(() => window.__aloniTest?.offlineReady());
  const note = page.getByTestId('offline-ready');
  await expect(note).toBeVisible();
  expect(await note.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  expect(await note.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  const during = await button.boundingBox();
  expect(during).toEqual(before);                                          // nothing moved
  await expect(note).toHaveCount(0, { timeout: 10_000 });                  // gone after a few seconds
});
