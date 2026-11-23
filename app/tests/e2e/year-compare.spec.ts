import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

// Φυτά › a crop › «Φέτος – πέρυσι»: crates per month from the grower's OWN harvest records; last year is also summed up to the same calendar day (like with like).
test('this year against last year: sums from his own records, like with like, and «no records last year» when there are none', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  await expect(page.getByTestId('year-nolast')).toBeVisible();                       // nothing recorded yet
  await expect(page.getByTestId('year-last-total')).toHaveText('άγνωστο');

  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'job_harvest'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!;
        const put = (id: string, at: string, crates: string) => tx.objectStore('job_harvest').put({ id, farm_id: p.farm_id, planting_id: p.id, harvested_at: at, crates_str: crates, created_at: at });
        put('y1', '2026-03-10T08:00:00.000Z', '10'); put('y2', '2026-11-20T08:00:00.000Z', '5');
        put('y3', '2025-03-12T08:00:00.000Z', '8'); put('y4', '2025-11-30T08:00:00.000Z', '4'); put('y5', '2025-06-01T08:00:00.000Z', '20');
      };
    };
  }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  await expect(page.getByTestId('year-this')).toHaveText('15 κλούβες');
  await expect(page.getByTestId('year-last-same')).toHaveText('28 κλούβες');          // 8 + 20: the 30 Nov harvest of last year is after the same day
  await expect(page.getByTestId('year-last-total')).toHaveText('32 κλούβες');
  await expect(page.getByTestId('year-nolast')).toHaveCount(0);
  await expect(page.getByTestId('year-chart')).toBeVisible();
  await expect(page.getByTestId('year-compare')).not.toContainText(/ασφαλ/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
