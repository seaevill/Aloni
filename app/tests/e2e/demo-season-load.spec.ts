import { expect, test } from '@playwright/test';
import { goTab, openSettings } from './helpers/tabs';
import { iphone } from './helpers/iphone';

// Demo season (queue item 32a): the opt-in «πλήρης σεζόν» Demo has seven fictional parcels with drawn outlines and fictional ΚΑΕΚ (labelled Demo), plantings and harvests; every tab opens at 320/375/390 without errors or sideways scroll.
for (const width of [320, 375, 390]) {
  test(`full-season Demo at ${width} px: seven parcels, ΚΑΕΚ 99… labelled Demo, all five tabs open without errors or sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const errors = await iphone(page);
    await openSettings(page);
    await page.getByTestId('demo-season-load').click();
    await expect(page.getByTestId('demo-banner')).toBeVisible();
    await page.locator('nav.tabs [data-tab="parcels"]').click();
    await expect(page.getByTestId('parcel-open')).toHaveCount(7);
    await page.getByTestId('parcel-open').first().click();
    await expect(page.getByTestId('kaek-value')).toContainText(/99\d{10}/);
    await expect(page.getByTestId('kaek-demo')).toBeVisible();
    await expect(page.getByTestId('kaek-edit')).toHaveCount(0);
    for (const tab of ['today', 'crops', 'parcels', 'stock', 'more']) {
      await goTab(page, tab);
      await page.waitForTimeout(400);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${tab} at ${width}`).toBeLessThanOrEqual(width);
    }
    expect(errors.filter((e) => !/icon-192|net::ERR/.test(e))).toEqual([]);
  });
}
