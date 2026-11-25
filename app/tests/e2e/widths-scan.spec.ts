import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Quality gate: no sideways scroll on any of the five tabs at 320, 375, 390 and 768 px, in Greek, with the Demo farm loaded (weather, plantings, stock and orders all present).
for (const width of [320, 375, 390, 768]) {
  test(`no horizontal scroll on the five tabs at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await fixClock(page);
    await page.goto('/');
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await expect(page.getByTestId('today-counts')).toBeVisible();
    await expect(page.getByTestId('weather-strip')).toBeVisible();
    const wide: string[] = [];
    for (const tab of ['today', 'crops', 'parcels', 'stock', 'more']) {
      await page.locator(`nav.tabs [data-tab="${tab}"]`).click();
      await page.waitForTimeout(300);
      const over = await page.evaluate((w) => document.documentElement.scrollWidth - w, width);
      if (over > 0) wide.push(`${tab}: ${over}px`);
    }
    expect(wide).toEqual([]);
  });
}
