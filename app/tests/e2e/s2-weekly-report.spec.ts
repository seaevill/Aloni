import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('the weekly report opens on the Demo farm and presents a printable date range', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  const open = page.getByTestId('open-weekly-report');
  await expect(open).toHaveAccessibleName('Εβδομαδιαία αναφορά');
  expect((await open.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await open.click();
  const report = page.getByTestId('weekly-report');
  await expect(report.getByTestId('weekly-range')).toContainText(/14 Νοεμβρίου 2026.*20 Νοεμβρίου 2026/);
  await expect(report.getByRole('heading', { name: 'Καταγεγραμμένες κλούβες' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Ολοκληρωμένες εργασίες' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Ειδοποιήσεις αποθήκης' })).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.emulateMedia({ media: 'print' });
  await expect(report.getByRole('heading', { name: 'Εβδομαδιαία αναφορά' })).toBeVisible();
  await expect(page.locator('nav.tabs')).toBeHidden();
});
