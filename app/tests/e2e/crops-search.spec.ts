import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Φυτά: the search box and the season-calendar button share a line. The search hint used to be cut off («Πληκτρολογήστ…») because the button took the larger share; now the hint is always fully visible (the button wraps below when the line is too narrow) and the layout never scrolls sideways.
for (const width of [320, 375, 390]) {
  test(`Demo Φυτά (${width} px): the search hint is fully visible, the calendar button works, no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await fixClock(page);
    await page.goto('/');
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await expect(page.getByTestId('today-counts')).toBeVisible();
    await page.locator('nav.tabs [data-tab="crops"]').click();
    const input = page.getByTestId('record-search');
    await expect(input).toBeVisible();
    const fit = await input.evaluate((el: HTMLInputElement) => {
      const cs = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      probe.textContent = el.placeholder;
      document.body.append(probe);
      const need = probe.getBoundingClientRect().width; probe.remove();
      return { need, room: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
    });
    expect(fit.need, 'placeholder width').toBeLessThanOrEqual(fit.room);
    await expect(page.getByTestId("season-calendar-open")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByTestId('season-calendar-open').click();
    await expect(page.getByTestId('season-calendar-open')).toHaveCount(0);
  });
}
