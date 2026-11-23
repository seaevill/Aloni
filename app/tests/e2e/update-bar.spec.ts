/// <reference path="../../src/pwa/update.ts" />
import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { installClock } from './helpers/clock';

test('a waiting new version shows a bar and changes nothing: the half-typed form and the address stay', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').fill('Γιώργος');
  const url = page.url();
  await page.evaluate(() => window.__aloniTest?.needRefresh());                 // the test hook: «a new version is waiting»
  await expect(page.getByTestId('update-bar')).toBeVisible();
  await expect(page.getByTestId('update-apply')).toBeVisible();
  await expect(page.getByTestId('worker-name')).toHaveValue('Γιώργος');           // nothing was reloaded
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
  // the button is never dead: with no worker waiting the page is simply reloaded
  const reloaded = page.waitForEvent('load', { timeout: 6000 });
  await page.getByTestId('update-apply').click();
  await reloaded;
  await expect(page.getByTestId('update-bar')).toHaveCount(0);
});

test('tapping a chip (no typing) also counts as unsaved: a waiting update does not apply by itself in the background', async ({ page }) => {
  await installClock(page);
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').click();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); window.__aloniTest?.needRefresh(); });
  await page.clock.runFor(2200);                                                // longer than the reload fallback
  await expect(page.getByTestId('worker-name')).toBeVisible();                    // the page was NOT reloaded
});
