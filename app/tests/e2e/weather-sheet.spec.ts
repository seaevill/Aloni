import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// The weather tiles open a sheet: the five days in one table, wind / gusts / rain, WHERE the numbers come from and WHEN they were issued, and a reason for everything missing (hourly values, no stored weather).
test.use({ viewport: { width: 375, height: 812 } });
const seed = (page: import('@playwright/test').Page, hoursAgo: number) => page.evaluate((h) => new Promise<void>((done) => {
  const r = indexedDB.open('aloni');
  r.onsuccess = () => {
    const tx = r.result.transaction(['parcels', 'weather'], 'readwrite');
    tx.objectStore('parcels').getAll().onsuccess = (e) => {
      const p = (e.target as IDBRequest<Array<{ id: string; farm_id: string }>>).result[0]!;
      const days = [0, 1, 2, 3].map((i) => ({ date: new Date(Date.now() + i * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Athens' }), tmin: 3, tmax: 11, rain_mm: 0.4, wind_kmh: 12, gust_kmh: 30, model: 'metno', issued_at: new Date(Date.now() - h * 3_600_000).toISOString() }));
      tx.objectStore('weather').put({ id: p.id, farm_id: p.farm_id, parcel_id: p.id, days });
    };
    tx.oncomplete = () => done();
  };
}), hoursAgo);

test('no stored weather: the tile still opens a sheet that says «Χωρίς δεδομένα» and why', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('weather-strip').click();
  const sheet = page.getByTestId('sheet-weather');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.ds-chip')).toContainText('Χωρίς δεδομένα');
  await expect(sheet.getByTestId('sheet-why')).toContainText('Δεν υπάρχει αποθηκευμένος καιρός');
  await expect(sheet.locator('.ds-fact').last()).toContainText('δεν υπάρχει στο τηλέφωνο');       // hourly: the reason
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/weather/farm');
});

test('stored weather: the table, the wind / gust / rain numbers, the source with its issue time, and the «old data» chip after 12 hours', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await seed(page, 3);
  await page.reload();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('weather-strip').click();
  const sheet = page.getByTestId('sheet-weather');
  await expect(sheet.locator('[data-testid="ds-weather"] tr')).toHaveCount(5);                      // five days
  await expect(sheet.locator('[data-testid="ds-weather"] tr[data-known="yes"]').first()).toContainText('11°');
  await expect(sheet.locator('[data-testid="ds-weather"] tr[data-known="no"]').last()).toContainText('άγνωστο');   // a day without values says so once
  await expect(sheet.locator('.ds-bignum')).toHaveCount(3);
  await expect(sheet).toContainText('MET Norway (CC BY 4.0)');
  await expect(sheet.locator('.ds-chip')).toHaveCount(0);                                            // fresh: no «old data» chip
  await page.getByTestId('sheet-close').click();
  await seed(page, 20);
  await page.reload();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('weather-strip').click();
  await expect(page.getByTestId('sheet-weather').locator('.ds-chip')).toContainText('Παλιά δεδομένα');
});

test('the weather tile is reachable by keyboard (Enter opens the sheet)', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('weather-strip').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('sheet-weather')).toBeVisible();
});
