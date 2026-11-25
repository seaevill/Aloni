import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Εργασίες → «Καθυστερημένες» → a job opens its detail: day, late, crop · field, product, who it was given to, the spray record and the harvests since. Unknown is written with its reason.
test.use({ viewport: { width: 375, height: 812 } });

test('a late job opens its detail with every fact or the reason it is missing', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  // a job planned for a day in the past (nobody did it), on the planting the setup made, with the product the setup made; no worker, no spray record
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'products', 'jobs', 'job_plantings'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll(); const pr = tx.objectStore('products').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => pr.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!; const prod = (pr.result as Array<{ id: string }>)[0]!;
        const day = new Date(Date.now() - 3 * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Athens' });   // the farm's calendar day (UTC differs from Athens after 22:00 UTC)
        tx.objectStore('jobs').put({ id: 'job-late-1', farm_id: p.farm_id, kind: 'spray', status: 'planned', planned_for: day, product_id: prod.id });
        tx.objectStore('job_plantings').put({ id: 'jp-late-1', farm_id: p.farm_id, job_id: 'job-late-1', planting_id: p.id });
      };
    };
  }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('tasks-counts').click();
  const late = page.getByTestId('sheet-jobs-overdue');
  await expect(late).toBeVisible();
  await late.getByTestId('job-row').click();
  const sheet = page.getByTestId('sheet-job');
  await expect(sheet).toContainText('Kocide 2000');                                              // the product is the heading
  await expect(sheet.locator('.ds-chip')).toContainText('Καθυστερημένες');                        // late
  await expect(sheet.getByTestId('job-late-days')).toHaveText('Καθυστερεί 3 ημ.');            // R9: how many days
  await expect(sheet).toContainText('Σπανάκι');                                                  // crop and field
  await expect(sheet).toContainText('Κάτω Κάμπος');
  await expect(sheet).toContainText('χωρίς εργάτη');                                             // nobody was given the job: said, not blank
  await expect(sheet.getByTestId('job-spray-none')).toContainText('Δεν υπάρχει ακόμη εγγραφή ψεκασμού');
  await expect(sheet.getByTestId('job-harvests-none')).toContainText('Καμία καταγραφή συγκομιδής');
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/job/job-late-1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);                                                            // closed: nothing is left open
});
