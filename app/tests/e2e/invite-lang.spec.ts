import { expect, test } from '@playwright/test';

// E4: an invitation link (…/?lang=hi) opens the app in that language on a phone that has no saved language; a saved language always wins; the language can still be changed.
test.use({ viewport: { width: 375, height: 812 }, locale: 'el-GR' });

test('a fresh phone opening ?lang=hi starts in Hindi and nothing is saved until she chooses', async ({ page }) => {
  await page.goto('/?lang=hi');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('hi');
  expect(await page.evaluate(() => localStorage.getItem('lang'))).toBeNull();
});

test('a saved language wins over the link; an unknown language in the link is ignored', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('lang', 'tr'));
  await page.goto('/?lang=hi');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('tr');
  await page.evaluate(() => localStorage.removeItem('lang'));
  await page.goto('/?lang=fr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('el');
});
