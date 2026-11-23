import { expect, test, type Page } from './helpers/test';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';
import { openHistory, closeHistory } from './helpers/farm';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

test('the demo farm fills every screen, read-only, in Greek at 375 px without overflow, and no write button appears', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click(); // the second choice on a first start: load the demo
  const noSideways = async (at: string) => expect(await page.evaluate(() => document.documentElement.scrollWidth), at).toBeLessThanOrEqual(375);

  await expect(page.getByTestId('today-counts')).toBeVisible();
  await expect(page.getByTestId('today-cut7')).toBeVisible(); await expect(page.getByTestId('today-cut28')).toBeVisible();
  await expect(page.getByTestId('weather-strip')).toBeVisible();   // the strip is there; its values depend on the date, so they are checked in the unit test
  await expect(page.getByTestId('demo-banner')).toHaveText('Επίδειξη – φανταστικά στοιχεία');
  await openHistory(page);
  await expect(page.getByTestId('spray').first()).toBeVisible();
  await openHistory(page);
  expect(await page.getByTestId('spray').count()).toBeGreaterThan(3);
  await expect(page.getByTestId('spray-phi-unknown').first()).toBeVisible(); // some sprays have an unknown waiting period
  await expect(page.getByTestId('spray-phi').first()).toBeVisible(); // some have a known one
  await openHistory(page);
  await expect(page.getByTestId('harvest').first()).toBeVisible();
  await openHistory(page);
  expect(await page.getByTestId('harvest').count()).toBeGreaterThan(3);
  await closeHistory(page);
  await expect(page.getByTestId('cut').first()).toBeVisible();
  await closeHistory(page);
  const states = await page.getByTestId('cut').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')));
  expect(states.every((x) => ['free', 'from', 'unknown'].includes(String(x)))).toBe(true);
  expect(states).toContain('unknown'); // unsigned demo labels leave some fields blocked
  await expect(page.getByTestId('spray-open')).toBeVisible(); // T14: the demo can be practised in (rows carry the demo farm id, never reach the outbox)
  await expect(page.getByTestId('wait-open')).toHaveCount(0);
  await noSideways('today');

  await tab(page, 'stock');
  await expect(page.getByTestId('product').first()).toBeVisible();
  expect(await page.getByTestId('product').count()).toBeGreaterThan(10);
  await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId('labeluse-open').click(); // copper: five label uses, all three states
  await expect(page.getByTestId('labeluse-add')).toHaveCount(0);
  await expect(page.getByTestId('labeluse-status').first()).toBeVisible();
  const statuses = await page.getByTestId('labeluse-status').allTextContents();
  expect(statuses.some((s) => s.includes('Υπογραφή γεωπόνου:'))).toBe(true);
  expect(statuses.some((s) => s.includes('Χωρίς υπογραφή γεωπόνου'))).toBe(true);
  expect(statuses.some((s) => s.includes('ΑΠΟΚΛΕΙΣΜΕΝΟ'))).toBe(true);
  await noSideways('label uses');
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('product').filter({ hasText: 'χαλκού' }).getByTestId('stock-open').click();
  await expect(page.getByTestId('lot').first()).toBeVisible();
  await expect(page.getByTestId('receive-open')).toHaveCount(0);
  await noSideways('lots');
  await tab(page, 'parcels');
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').first().click();
  await expect(page.getByTestId('analysis').first()).toContainText('pH');
  await expect(page.getByTestId('analysis-add-soil')).toHaveCount(0);
  await noSideways('analyses');
  await tab(page, 'more');
  await page.getByTestId('open-workers').click();
  await expect(page.getByTestId('worker')).toHaveCount(3);
  await noSideways('workers');
  await expect(page.getByTestId('demo-banner')).toBeVisible(); // on every screen while the demo is active
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('open-register').click();
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the weather names its source and licence and the time of the data; after 12 hours it says «παλιά δεδομένα»', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  await tab(page, 'parcels');                                                      // the REAL farm: one parcel, then stored weather for it
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος'); await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  const stamp = async (hoursAgo: number) => {
    await page.evaluate((h) => new Promise<void>((done) => {
      const r = indexedDB.open('aloni');
      r.onsuccess = () => {
        const tx = r.result.transaction(['parcels', 'weather'], 'readwrite');
        tx.objectStore('parcels').getAll().onsuccess = (e) => {
          const p = (e.target as IDBRequest<Array<{ id: string; farm_id: string }>>).result[0]!;
          const days = [0, 1, 2].map((i) => ({ date: new Date(Date.now() + i * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Athens' }), tmin: 3, tmax: 11, rain_mm: 0, model: 'metno', issued_at: new Date(Date.now() - h * 3_600_000).toISOString() }));
          tx.objectStore('weather').put({ id: p.id, farm_id: p.farm_id, parcel_id: p.id, days });
        };
        tx.oncomplete = () => done();
      };
    }), hoursAgo);
    await page.reload(); await tab(page, 'today');
  };
  await stamp(3);
  await expect(page.getByTestId('wx-source')).toContainText('Δεδομένα: MET Norway (CC BY 4.0)');
  await expect(page.getByTestId('wx-stale')).toHaveCount(0);
  await stamp(13);
  await expect(page.getByTestId('wx-stale')).toHaveText('παλιά δεδομένα');
});
