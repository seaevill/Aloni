import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('Demo worker view: an open job nobody has is listed with «Το αναλαμβάνω»; taking it moves it to my jobs; a job someone else took cannot be taken', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['jobs', 'job_plantings', 'plantings', 'products', 'workers'], 'readwrite');
      const jobs = tx.objectStore('jobs').getAll(); const pl = tx.objectStore('plantings').getAll(); const pr = tx.objectStore('products').getAll(); const wk = tx.objectStore('workers').getAll();
      tx.oncomplete = () => ok();
      wk.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!; const prod = (pr.result as Array<{ id: string }>)[0]!;
        const other = (wk.result as Array<{ id: string }>)[1]!;
        const day = new Date().toISOString().slice(0, 10);
        const base = (jobs.result as Array<Record<string, unknown>>).find((j) => j.kind === 'spray' && j.status === 'planned')!;
        tx.objectStore('jobs').put({ ...base, id: 'job-free-1', farm_id: p.farm_id, planned_for: day, worker_id: undefined, product_id: prod.id });
        tx.objectStore('jobs').put({ ...base, id: 'job-taken-1', farm_id: p.farm_id, planned_for: day, worker_id: other.id, product_id: prod.id });
        tx.objectStore('job_plantings').put({ id: 'jp-free-1', farm_id: p.farm_id, job_id: 'job-free-1', planting_id: p.id });
      };
    };
  }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  const free = page.getByTestId('worker-free-job');
  await expect(free).toHaveCount(1);
  const take = free.getByTestId('worker-take');
  expect((await take.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  const before = await page.getByTestId('worker-job').count();
  await take.click();
  await expect(page.getByTestId('worker-free-job')).toHaveCount(0);
  await expect(page.getByTestId('worker-job')).toHaveCount(before + 1);
});
