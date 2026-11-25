import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Field Atelier P0 (2026-11-24): ivory canvas and warm-white cards from the tokens, the bottom bar's leaf marker on the current tab, and Σήμερα in the order the handoff asks for:
// what needs attention first (urgent card, the numbers, the two capture buttons), the day's work next, the weather as a quiet card after it. Nothing is removed: every test id stays.
test('Σήμερα (Demo, 375 px): urgent card, numbers and both capture buttons are on the first screen; the weather comes after the day\'s work; nothing overflows sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  const first = (id: string) => page.getByTestId(id).first();
  for (const id of ['urgent', 'today-numbers', 'spray-open', 'harvest-open']) {
    const box = await first(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y + box!.height, `${id} is inside the first screen`).toBeLessThanOrEqual(812 - 72);   // above the 72 px bottom bar
  }
  const y = async (id: string) => (await first(id).boundingBox())!.y;
  expect(await y('weather-strip')).toBeGreaterThan(await y('tasks-counts'));                         // weather after the day's work
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const colors = await page.evaluate(() => ({ canvas: getComputedStyle(document.body).backgroundColor, card: getComputedStyle(document.querySelector('.card')!).backgroundColor }));
  expect(colors.canvas).toBe('rgb(245, 242, 233)');                                                  // ivory #F5F2E9
  expect(colors.card).toBe('rgb(255, 254, 250)');                                                    // warm white #FFFEFA
  const marker = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('nav.tabs [aria-current="page"]')!, '::before'); return [s.content, s.height]; });
  expect(marker[0]).not.toBe('none');                                                                // the leaf marker above the current tab
  expect(marker[1]).toBe('3px');
  await page.getByTestId('harvest-open').click();                                                     // harvest capture: one tap from here
  await expect(page.getByTestId('harvest-crates')).toBeVisible();
});
