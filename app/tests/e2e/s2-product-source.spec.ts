import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('the Demo stock product opens recorded label and balance facts', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  const open = page.getByTestId('product-source-open').filter({ hasText: 'χαλκού' });
  expect((await open.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await open.click();

  const sheet = page.getByTestId('product-source');
  await expect(sheet.getByRole('dialog')).toBeVisible();
  await expect(sheet.getByTestId('product-knowledge')).toContainText(/ανόργανη ένωση του χαλκού/i);
  await page.context().setOffline(true);
  await expect(sheet).toContainText('άγνωστο – λείπει από την ετικέτα');
  await expect(sheet).toContainText(/4,5\s*kg/);
  await expect(sheet).toContainText('Σπανάκι');
  await expect(sheet).toContainText('Δεν έχει επιβεβαιωθεί επίσημος σύνδεσμος');
  await expect(sheet.locator('a')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await sheet.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
});
