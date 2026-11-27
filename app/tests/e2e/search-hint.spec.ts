import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { fixClock } from './helpers/clock';

// The search box says what to type (a placeholder), on Φυτά and Χωράφια; typing still filters, Latin letters still match Greek names.
test('search fields carry a hint and still filter (Greek name by Latin letters)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  for (const tab of ['crops', 'parcels']) {
    await goTab(page, tab);
    const box = page.getByTestId('record-search');
    await expect(box).toHaveAttribute('placeholder', 'Όνομα (και λατινικά)');
    await box.fill('xyz-nothing');
    await expect(page.getByRole('status').filter({ hasText: 'Δεν βρέθηκε' })).toBeVisible();
    await box.fill('');
  }
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('record-search').fill('spanaki');
  await expect(page.getByTestId('crop-open')).toHaveCount(1);
});
