import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Σήμερα → «Σήμερα έγιναν»: when a job is late but nothing was recorded today, the card must say so (it used to show its title alone, because a late job switched the sentence off).
test.use({ viewport: { width: 375, height: 812 } });

test('a late job and no record today: the done card says nothing was recorded', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'products', 'jobs', 'job_plantings'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll(); const pr = tx.objectStore('products').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => pr.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!; const prod = (pr.result as Array<{ id: string }>)[0]!;
        const day = new Date(Date.now() - 3 * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Athens' });
        tx.objectStore('jobs').put({ id: 'job-late-w', farm_id: p.farm_id, kind: 'spray', status: 'planned', planned_for: day, product_id: prod.id });
        tx.objectStore('job_plantings').put({ id: 'jp-late-w', farm_id: p.farm_id, job_id: 'job-late-w', planting_id: p.id });
      };
    };
  }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('jobs-overdue')).toBeVisible();                                   // the job really is late
  const who = page.getByTestId('today-who');
  await expect(who).toContainText('Σήμερα έγιναν');
  await expect(who.getByTestId('today-who-none')).toHaveText('Δεν έχει καταγραφεί τίποτα σήμερα.');
});
