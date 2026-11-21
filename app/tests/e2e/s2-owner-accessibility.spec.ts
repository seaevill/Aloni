import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

const stages = [
  ['crops', 'crops', undefined, 'crop-open'],
  ['crop detail', 'crops', 'crop-open', 'crop-detail'],
  ['parcels', 'parcels', undefined, 'parcel-open'],
  ['parcel detail', 'parcels', 'parcel-open', 'parcel-detail'],
  ['stock', 'stock', undefined, 'product'],
  ['lot history', 'stock', 'stock-open', 'lot'],
  ['register', 'more', 'open-register', 'register-line'],
  ['More', 'more', undefined, 'more-menu'],
  ['orders', 'more', 'open-orders', 'orders'],
  ['spray', 'today', 'spray-open', 'spray-dose'],
] as const;

for (const [name, tab, open, marker] of stages) {
  test(`Greek Demo accessibility: ${name}`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/*', (route) => {
      return new URL(route.request().url()).origin === origin ? route.continue() : route.abort();
    });
    await fixClock(page);
    await page.goto('/');
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await expect(page.getByTestId('today-counts')).toBeVisible();
    await page.locator(`nav.tabs [data-tab="${tab}"]`).click();
    if (open === 'stock-open') await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId(open).click();
    else if (open) await page.getByTestId(open).first().click();
    await expect(page.getByTestId(marker).first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'el');
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations
      .filter((item) => item.impact === 'serious' || item.impact === 'critical')
      .map((item) => [item.id, item.nodes.map((node) => node.target)]), name).toEqual([]);
  });
}
