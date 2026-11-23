import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// E2 the bell on Σήμερα: nothing new at first (the first look starts the clock, old jobs are not «new»); a job finished afterwards shows a count; opening the list shows it and clears the count.
test.use({ viewport: { width: 375, height: 812 } });

const putJob = (page: import('@playwright/test').Page, id: string, status: string, doneAt: string | null) => page.evaluate(([jid, st, at]) => new Promise<void>((ok, bad) => {
  const open = indexedDB.open('aloni');
  open.onerror = () => bad(new Error('open'));
  open.onsuccess = () => {
    const db = open.result; const tx = db.transaction(['parcels', 'jobs'], 'readwrite');
    const g = tx.objectStore('parcels').getAll();
    g.onsuccess = () => { tx.objectStore('jobs').put({ id: jid, farm_id: (g.result[0] as { farm_id: string }).farm_id, kind: 'spray', status: st, done_at: at, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); };
    tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = () => bad(new Error('tx'));
  };
}), [id, status, doneAt] as const);

test('the bell counts a job finished after the last look, lists it, and the count clears', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  const bell = page.getByTestId('bell');
  await expect(bell).toBeVisible();
  expect((await bell.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await expect(page.getByTestId('bell-count')).toHaveCount(0);                      // first look: nothing is new
  await bell.click();
  await expect(page.getByTestId('sheet-notices').getByTestId('sheet-why')).toContainText('Δεν υπάρχει τίποτα νέο');
  await page.getByTestId('sheet-close').click();
  await putJob(page, 'job-bell-1', 'done', new Date().toISOString());   // a worker finishes a job after the owner last looked
  await page.reload();
  await expect(page.getByTestId('bell-count')).toHaveText('1');
  await expect(bell).toHaveAccessibleName(/1/);
  await bell.click();
  await expect(page.getByTestId('notice')).toHaveCount(1);
  await expect(page.getByTestId('notice')).toContainText('Η εργασία ολοκληρώθηκε');
  expect(await page.evaluate(() => location.hash)).toContain('/sheet/notices/owner');
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('bell-count')).toHaveCount(0);                      // looked at: the count clears
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

// The worker's screen has the same bell (her own new jobs); on the demo farm nothing was assigned after she looked, so it starts empty and opens the reason.
test('the worker screen has the bell: 56 px, no count at first, and a reason when opened', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn').first().click();          // the demo farm (it has the worker view)
  await page.getByTestId('open-worker-view').click();
  const bell = page.getByTestId('worker-app').getByTestId('bell');
  await expect(bell).toBeVisible();
  expect((await bell.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await expect(page.getByTestId('bell-count')).toHaveCount(0);
  await bell.click();
  await expect(page.getByTestId('sheet-notices').getByTestId('sheet-why')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
