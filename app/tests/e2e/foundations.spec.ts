import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('the offline chip appears without a connection and goes away when it is back', async ({ page, context }) => {
  await iphone(page);
  await expect(page.getByTestId('sync-chip')).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByTestId('sync-chip')).toContainText('Εκτός σύνδεσης');
  await context.setOffline(false);
  await expect(page.getByTestId('sync-chip')).toHaveCount(0);
});

test('empty state has ONE action; undo (no dialog) brings the demo back; the toast disappears after 5 s', async ({ page }) => {
  await page.clock.install();
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await expect(page.getByTestId('empty-state').locator('button')).toHaveCount(1);
  await page.getByTestId('empty-state').locator('button').click(); // the one action: load the demo
  await expect(page.locator('main .card')).toHaveCount(10);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn.danger').click();
  await expect(page.getByTestId('toast')).toContainText('Η επίδειξη διαγράφηκε');
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('main .card')).toHaveCount(5); // the demo is back
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn.danger').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await page.clock.runFor(5100);
  await expect(page.getByTestId('toast')).toHaveCount(0);
  expect(dialogs).toEqual([]);
});
