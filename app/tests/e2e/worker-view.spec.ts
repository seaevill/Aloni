import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const count = (page: Page, store: string) => page.evaluate((s) => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).count(); q.onsuccess = () => res(q.result); }; }), store);

test('worker view (demo only): assigned sprays «Έγινε / Δεν έγινε» with 72 px buttons and a 10 s undo; product and dose cannot be changed', async ({ page }) => {
  await page.clock.install();
  const errors = await iphone(page);
  await expect(page.getByTestId('open-worker-view')).toHaveCount(0); // not offered on the real farm
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible(); // the demo is loaded
  // the demo's older sprays have unknown waiting periods (that keeps the buttons closed, see the next test): clear them so this flow can run
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction(['job_spray'], 'readwrite'); tx.objectStore('job_spray').clear(); tx.oncomplete = () => done(); }; }));
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.locator('nav.tabs')).toHaveCount(0);
  const jobs = page.getByTestId('worker-job');
  await expect(jobs).toHaveCount(2); // Γιώργος has two open sprays
  await expect(jobs.first().getByTestId('worker-dose')).toContainText('Δόση:');
  expect(await jobs.first().getByTestId('job-done').evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(72);
  await expect(jobs.first().locator('input')).toHaveCount(0); // no dose or product input at all

  const sprays = await count(page, 'job_spray');
  await jobs.first().getByTestId('job-done').click();
  await expect(page.locator('input[type=datetime-local]')).toBeVisible(); // time and note only
  await page.getByTestId('job-confirm').click();
  await expect(jobs).toHaveCount(1);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click(); // taken back: nothing was written
  await expect(jobs).toHaveCount(2);
  expect(await count(page, 'job_spray')).toBe(sprays);

  await jobs.first().getByTestId('job-done').click();
  await page.getByTestId('job-confirm').click();
  await expect(page.getByTestId('toast')).toContainText('10 δευτερόλεπτα');
  await page.clock.fastForward(10500); // the 10 seconds pass
  await expect(page.getByTestId('worker-finished')).toHaveCount(1);
  expect(await count(page, 'job_spray')).toBe(sprays + 1);

  await jobs.first().getByTestId('job-skip').click();
  await page.getByTestId('skip-rain').click();
  await page.clock.fastForward(10500);
  await expect(page.getByTestId('worker-finished')).toHaveCount(2);
  await expect(page.getByTestId('worker-nojobs')).toBeVisible();
  expect(await count(page, 'job_spray')).toBe(sprays + 1); // «not done» writes no spray

  await page.getByTestId('worker-tab-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος (Lower Plain)' }).click();
  await page.getByTestId('kind-pest').click();
  const obs = await count(page, 'observations');
  await page.getByTestId('observe-save').click();
  await page.clock.fastForward(10500);
  await expect.poll(() => count(page, 'observations')).toBe(obs + 1);

  await page.getByTestId('worker-tab-harvest').click();
  await expect(page.getByTestId('harvest-more')).toBeVisible();
  expect(await page.getByTestId('harvest-more').evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(72);
  await page.getByTestId('worker-exit').click();
  await expect(page.locator('nav.tabs')).toBeVisible();
  expect(errors).toEqual([]);
});

test('worker view: a field that was just sprayed shows a red re-entry warning and the «Έγινε» button is locked', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible(); // the demo is loaded
  // put a spray that ended just now (REI 24 h) on the field of the first open job
  await page.evaluate(() => new Promise<void>((done) => {
    const r = indexedDB.open('aloni');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction(['jobs', 'job_plantings', 'job_spray'], 'readwrite');
      const jobs = tx.objectStore('jobs').getAll();
      jobs.onsuccess = () => {
        const planned = (jobs.result as Array<Record<string, unknown>>).filter((j) => j.status === 'planned' && j.worker_id);
        const links = tx.objectStore('job_plantings').getAll();
        links.onsuccess = () => {
          for (const job of planned) { // every open job's field was just sprayed
            const link = (links.result as Array<Record<string, unknown>>).find((l) => l.job_id === job.id);
            tx.objectStore('job_plantings').put({ id: `lock-jp-${String(job.id)}`, farm_id: job.farm_id, job_id: `lock-job-${String(job.id)}`, planting_id: link?.planting_id });
            tx.objectStore('job_spray').put({ id: `lock-sp-${String(job.id)}`, farm_id: job.farm_id, job_id: `lock-job-${String(job.id)}`, sprayed_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), rei_hours: '24', phi_days: '7', created_at: new Date().toISOString() });
          }
        };
      };
      tx.oncomplete = () => done();
    };
  }));
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-lock').first()).toContainText('Μην μπείτε στο χωράφι μέχρι');
  await expect(page.getByTestId('job-done').first()).toBeDisabled();
  await expect(page.getByTestId('job-skip').first()).toBeEnabled(); // «Δεν έγινε» stays possible
});

test('worker view: an UNKNOWN re-entry period keeps «Έγινε» closed too, and says so in red', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-lock').first()).toContainText('Άγνωστο διάστημα επανεισόδου');
  for (const b of await page.getByTestId('job-done').all()) await expect(b).toBeDisabled();
  await expect(page.getByTestId('job-skip').first()).toBeEnabled();
});
