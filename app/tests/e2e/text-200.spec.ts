import { expect, test } from './helpers/test';
import { eachScreen, iphone } from './helpers/iphone';

// Accessibility (D15): the phone's «larger text» setting at 200 % must not push any screen sideways. Fonts are rem tokens, so the root size scales them.
test('200 % text size: no sideways scroll on any screen, el/tr/en, empty and demo', async ({ page }) => {
  test.setTimeout(240_000);
  await iphone(page);
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(32);
  expect(await page.locator('h1').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(56); // the tokens really follow the root size
  const failures: string[] = [];
  await eachScreen(page, async ({ lang, route, state }) => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - 375);
    if (wide > 0) failures.push(`${state}/${lang}/${route}: ${wide}px too wide`);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('nav.tabs button')].filter((b) => b.scrollWidth > b.clientWidth + 1).length);   // a tab label must fit inside its own cell (every engine)
    if (clipped > 0) failures.push(`${state}/${lang}/${route}: ${clipped} tab labels overflow their cell`);
  });
  expect(failures).toEqual([]);
});
