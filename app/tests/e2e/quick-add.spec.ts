import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';
import { athensInput, fixClock } from './helpers/clock';
import { DAY_MS } from '../helpers/clock';

// Quick add: one round «＋» on Σήμερα in the thumb zone; four 56 px rows; each opens the right form; the observation form saves a record; Back closes the menu.
test.use({ viewport: { width: 375, height: 812 } });

test('the plus sits at the bottom right above the tab bar (thumb zone, 56 px); the menu has four rows of at least 56 px', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  const fab = page.getByTestId('quick-open');
  const b = (await fab.boundingBox())!;
  expect(b.width).toBeGreaterThanOrEqual(56); expect(b.height).toBeGreaterThanOrEqual(56);
  expect(b.y).toBeGreaterThan(812 * 0.6);                                              // lower 40 % of the screen: reachable with the thumb
  expect(b.x + b.width).toBeGreaterThan(375 - 40);                                     // right edge
  const tab = (await page.locator('nav.tabs').boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(tab.y);                                   // never under the tab bar
  await fab.click();
  const rows = page.locator('[data-testid="quick-menu"] button.ds-row');
  await expect(rows).toHaveCount(4);
  for (const r of await rows.all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await page.keyboard.press('Escape');                                                  // the menu is transient: Escape, the scrim or a row closes it
  await expect(page.getByTestId('quick-menu')).toHaveCount(0);
});

test('each row opens its form: spraying, harvest, observation (saves a record) and a job for tomorrow (the day is already tomorrow)', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('quick-open').click(); await page.getByTestId('quick-spray').click();
  await expect(page.getByTestId('spray-save')).toBeVisible();
  await page.reload();                                                                  // (Back from a form with input asks first: see back-gesture.spec)
  await page.getByTestId('quick-open').click(); await page.getByTestId('quick-harvest').click();
  await expect(page.getByTestId('harvest-save')).toBeVisible();
  await page.reload();
  await page.getByTestId('quick-open').click(); await page.getByTestId('quick-job').click();
  const tomorrow = (await athensInput(page, DAY_MS)).slice(0, 10);
  await expect(page.locator('input[type="date"]')).toHaveValue(tomorrow);
  await page.reload();
  await page.getByTestId('quick-open').click(); await page.getByTestId('quick-observe').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-error')).toBeVisible();                         // nothing chosen: refused with the reason
  await page.locator('.seg button').first().click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-saved')).toBeVisible();
  const n = await page.evaluate(() => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('observations').objectStore('observations').count(); q.onsuccess = () => res(q.result); }; }));
  expect(n).toBe(1);
});
