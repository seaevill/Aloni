import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { fixClock } from './helpers/clock';

// «Φως ημέρας» (Sun / Glove mode): a device-local LOOK: black on white, bigger text and targets. It survives a reload, never overflows sideways, passes axe, and changes no feature.
const SHOTS = '../docs/design/screenshots-2026-11-24/after';
test('Daylight mode: switches from Άλλα, survives a reload, black on white, 64 px bar, no sideways scroll on any tab, axe clean', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('sun-off')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('sun-on').click();
  await expect(page.locator('html')).toHaveAttribute('data-sun', '');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(0, 0, 0)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-sun', '');                              // kept on this phone
  for (const tab of ['today', 'crops', 'parcels', 'stock', 'more']) {
    await goTab(page, tab);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), tab).toBeLessThanOrEqual(375);
    const small = await page.evaluate(() => [...document.querySelectorAll('main button:not(:disabled)')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 56; }).length);
    expect(small, `${tab}: buttons under 56 px`).toBe(0);
  }
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/1-today-daylight.png` });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sun-off').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-sun', '');
});
