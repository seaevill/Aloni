import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { fixClock } from './helpers/clock';

const screens = [
  { tab: 'crops', open: 'crop-open', detail: 'crop-detail' },
  { tab: 'parcels', open: 'parcel-open', detail: 'parcel-detail' },
];

for (const screen of screens) {
  test(`Greek keyboard focus returns to the original ${screen.tab} row`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.setViewportSize({ width: 375, height: 812 });
    await fixClock(page);
    await page.goto('/');
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await goTab(page, screen.tab);
    const opener = page.getByTestId(screen.open).first();
    await expect(opener).toBeVisible();
    await opener.press('Enter');
    const detail = page.getByTestId(screen.detail);
    await expect(page.locator('html')).toHaveAttribute('lang', 'el');
    await expect(detail.getByRole('heading', { level: 1 })).toBeFocused();
    await detail.getByRole('button', { name: 'Επιστροφή' }).press('Enter');
    await expect(opener).toBeFocused();
  });
}
