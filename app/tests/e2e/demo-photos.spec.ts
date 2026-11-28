import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// Demo season photos (queue 33b): ten photos on Άλλα → Φωτογραφίες, each with its source line (author · licence · Wikimedia Commons); not shown in the classic Demo; fetched lazily (not at start-up).
test('season Demo: ten photos with a source line each, lazy; the classic Demo shows none', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/demo-photos/')) fetched.push(r.url()); });
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();                        // classic Demo
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('demo-photos')).toHaveCount(0);
  await page.getByRole('button', { name: /Πίσω|Επιστροφή/ }).first().click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('demo-season-load').click();
  await expect(page.getByText('Η επίδειξη φορτώθηκε.')).toBeVisible();                              // the season is in
  expect(fetched).toEqual([]);                                                                    // nothing fetched at load
  await page.getByRole('button', { name: /Πίσω|Επιστροφή/ }).first().click();
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('demo-photo')).toHaveCount(10);
  const sources = await page.getByTestId('demo-photo-source').allInnerTexts();
  expect(sources).toHaveLength(10);
  for (const s of sources) expect(s).toMatch(/ · CC (BY|BY-SA)[ \d.]* · Wikimedia Commons$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
