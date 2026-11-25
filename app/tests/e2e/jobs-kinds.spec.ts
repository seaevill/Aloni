import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

// Σήμερα › Εργασίες: every kind of job is shown (the server knows fertilise, irrigate, sow, harvest, other), named by its kind; nothing is hidden because the first screen was built for sprayings.
test('a fertilising job and an irrigation job planned for today are listed with their kind, in Σήμερα and in Εργασίες', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'jobs'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => {
        const p = (pl.result as Array<{ farm_id: string }>)[0]!;
        const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Athens' });
        tx.objectStore('jobs').put({ id: 'job-fert-1', farm_id: p.farm_id, kind: 'fertilise', status: 'planned', planned_for: day });
        tx.objectStore('jobs').put({ id: 'job-irr-1', farm_id: p.farm_id, kind: 'irrigate', status: 'planned', planned_for: day });
      };
    };
  }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="today"]').click();
  const planned = page.getByTestId('job-planned');
  await expect(planned).toHaveCount(2);
  await expect(planned.filter({ hasText: 'Λίπανση' })).toHaveCount(1);
  await expect(planned.filter({ hasText: 'Άρδευση' })).toHaveCount(1);
  await page.getByTestId('tasks-counts').evaluate((el) => (el as HTMLElement).click());
  const sheet = page.getByTestId('sheet-jobs-today');
  await expect(sheet).toContainText('Λίπανση');
  await expect(sheet).toContainText('Άρδευση');
  await expect(page.getByTestId('sheet-why')).toHaveCount(0);                          // not «no jobs»
});
