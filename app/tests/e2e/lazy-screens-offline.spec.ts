import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// Queue item 7 (first-load budget): the Άλλα screens Μητρώο, Παραγγελίες, Πελάτες, Εργάτες, Πληροφορίες and the weekly
// report are separate chunks now. The first session is the hard case (DECISIONS 2026-11-22): the service worker does
// not control the page yet. Simulated here with no service worker at all: the phone opens the app once while online,
// loses the signal, and every one of these screens must still open (they are imported right after the first screen).
test.use({ serviceWorkers: 'block' });

const SCREENS: { open: string; shows: string }[] = [
  { open: 'open-register', shows: 'register' },
  { open: 'open-orders', shows: 'orders' },
  { open: 'open-customers', shows: 'customers' },
  { open: 'open-weekly-report', shows: 'weekly-report' },
  { open: 'open-info', shows: 'invite-status' },
  { open: 'open-workers', shows: '' },
];

test('first session, then no signal: every Άλλα screen kept out of the first load still opens', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('more-menu')).toBeVisible();
  await page.waitForLoadState('networkidle');      // the warm-up imports have finished while online
  await context.setOffline(true);
  for (const { open, shows } of SCREENS) {
    await page.getByTestId(open).click();
    await expect(page.getByTestId('more-menu')).toHaveCount(0);
    await expect(page.getByTestId('lazy-screen-failed')).toHaveCount(0);
    await expect(page.getByTestId('lazy-screen-loading')).toHaveCount(0);
    if (shows) await expect(page.getByTestId(shows)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Επιστροφή', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Επιστροφή', exact: true }).first().click();
    await expect(page.getByTestId('more-menu')).toBeVisible();
  }
  await context.setOffline(false);
  expect(errors.filter((e) => !e.includes('icon-192'))).toEqual([]);
});
