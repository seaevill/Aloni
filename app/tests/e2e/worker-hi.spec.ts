import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// Hindi on the worker screens: Devanagari shown with the bundled font (offline), the safety texts TOGETHER with the Greek ones, the translation marked «προς έλεγχο»,
// language-free symbols (✓ ✗ 🔒) always visible, and 375 px with no sideways scroll.
test('worker screens in Hindi: translated, the lock in Hindi AND Greek, marked for review, symbols visible, no overflow', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();          // the demo
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'हिन्दी' }).click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.getByTestId('worker-app')).toContainText('आज के काम');           // «today's jobs»
  await expect(page.getByTestId('hi-review')).toContainText('προς έλεγχο');          // the marker is in Greek too
  const lock = page.getByTestId('worker-lock').first();                              // the demo's older sprays have unknown re-entry: the lock shows
  await expect(lock).toContainText('खेत');                                           // Hindi …
  await expect(lock).toContainText('Άγνωστο διάστημα επανεισόδου');                  // … and the Greek text next to it
  await expect(lock.locator('svg[data-icon="lock"]')).toBeVisible();                // the symbol is the shared lock icon (D12), next to the words
  await expect(page.getByTestId('job-done').first()).toContainText('✓');
  await expect(page.getByTestId('job-skip').first()).toContainText('✗');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  // the Devanagari font ships with the app: it is the one used for Hindi, with no network
  expect(await page.evaluate(async () => { await document.fonts.load('16px "Noto Sans Devanagari"', 'आ'); return document.fonts.check('16px "Noto Sans Devanagari"', 'आ'); })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('hi');
  for (const b of await page.locator('main .seg.big button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(72);
  expect(errors).toEqual([]);
});
