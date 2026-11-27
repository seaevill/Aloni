import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';

// Greek (and TR/EN) strings run long: nothing may stick out of the 375 px screen or force sideways scrolling.
const TABS = ['today', 'crops', 'parcels', 'stock', 'more'] as const;

test('no horizontal overflow at 375 px, with demo data, in el/tr/en, on every tab', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn').first().click(); // the first big button = load demo (text differs per PR/language)
  await expect(page.getByTestId('demo-banner')).toBeVisible();      // wait until the demo is loaded: its banner pushes the page down, a tap sent before it lands on the wrong spot
  for (const lang of ['EL', 'TR', 'EN']) {
    await page.locator('nav.tabs [data-tab="more"]').click();
    await page.getByRole('button', { name: lang, exact: true }).click();
    for (const id of TABS) {
      await goTab(page, id);
      const { scroll, wide } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        // an element inside a row that scrolls sideways BY DESIGN (the stock filter) may reach past the screen; the row itself may not
        wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 376 && !(e.parentElement?.closest('[data-scroll-row], .filters') && ['auto', 'scroll'].includes(getComputedStyle(e.parentElement.closest('[data-scroll-row], .filters') as Element).overflowX))).map((e) => e.tagName + '.' + e.className),
      }));
      expect(scroll, `${lang}/${id} scrollWidth`).toBeLessThanOrEqual(375);
      expect(wide, `${lang}/${id} elements wider than the screen`).toEqual([]);
    }
  }
});
