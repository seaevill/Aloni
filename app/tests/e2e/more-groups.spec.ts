import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Άλλα is grouped by job (work and team · reports and history · information). Every entry that existed is still there and opens (zero feature loss); the Demo block has its own heading.
const SHOTS = '../docs/design/screenshots-2026-11-24';
test('Άλλα: the same entries (plus Ταμείο after Πελάτες), in the same order, under three group headings, each still opens; the Demo block is labelled', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  const menu = page.getByTestId('more-menu');
  await expect(menu.locator('h2.menu-group')).toHaveText(['Καθημερινή δουλειά', 'Αναφορές και φωτογραφίες', 'Πληροφορίες']);
  const order = await menu.locator('button.row').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(order).toEqual(['open-register', 'open-orders', 'open-worker-view', 'open-customers', 'open-money', 'open-workers', 'open-weekly-report', 'open-photos', 'open-info']);   // the order the earlier tests fixed: nothing moved, only headings were added
  for (const id of ['open-workers', 'open-customers', 'open-money', 'open-orders', 'open-worker-view', 'open-register', 'open-weekly-report', 'open-photos', 'open-info']) await expect(menu.getByTestId(id), id).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Επίδειξη (φανταστικά στοιχεία)' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/after/5-more-grouped.png` });
  for (const id of ['open-workers', 'open-customers', 'open-money', 'open-orders', 'open-register', 'open-weekly-report', 'open-photos', 'open-info']) {
    await menu.getByTestId(id).click();
    await expect(menu, `${id} opens its own view`).toBeHidden();
    await page.getByRole('button', { name: /Πίσω|Επιστροφή/ }).first().click();
    await expect(menu).toBeVisible();
  }
});
