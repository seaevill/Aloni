import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T14: the demo farm is writable (practice) and can be reset; nothing of it is queued for sync.
test('demo: the spray and job forms open, and «Επαναφορά επίδειξης» restores the original', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.getByTestId('spray-open').click();
  await expect(page.getByTestId('spray-save')).toBeVisible();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.getByTestId('job-open').click();
  await expect(page.getByTestId('job-save')).toBeVisible();
  await page.getByRole('button', { name: 'Ακύρωση' }).first().click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('demo-load')).toHaveText('Επαναφορά επίδειξης');
  await page.getByTestId('demo-load').click();
  await expect(page.getByRole('status').filter({ hasText: /επίδειξη/i }).first()).toBeVisible();
  const outbox = await page.evaluate(async () => {
    const dbs = await indexedDB.databases(); let n = 0;
    for (const d of dbs) {
      const open = indexedDB.open(d.name as string);
      const db: IDBDatabase = await new Promise((ok) => { open.onsuccess = () => ok(open.result); });
      if (db.objectStoreNames.contains('outbox')) n += await new Promise<number>((ok) => { const r = db.transaction('outbox').objectStore('outbox').count(); r.onsuccess = () => ok(r.result); });
      db.close();
    }
    return n;
  });
  expect(outbox).toBe(0);
  expect(errors).toEqual([]);
});

const count = (page: import('@playwright/test').Page, store: string) => page.evaluate((name) => new Promise<number>((ok) => {
  const open = indexedDB.open('aloni');
  open.onsuccess = () => { const r = open.result.transaction([name]).objectStore(name).count(); r.onsuccess = () => { open.result.close(); ok(r.result); }; };
}), store);

// T14 (rest): a whole practice round in the demo, not only «the form opens»: a harvest is really recorded, the demo's worker view works, and «Επαναφορά επίδειξης» brings the demo back exactly as it was.
test('demo: a harvest is recorded for real, and the reset restores the original number of records; no real-farm data is touched', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();                    // the demo farm
  await expect(page.getByTestId('demo-banner').first()).toBeVisible();
  const before = await count(page, 'job_harvest');
  await page.getByTestId('harvest-open').click();
  const chips = page.getByTestId('harvest-chip');
  await expect(chips.first()).toBeVisible();
  const n = await chips.count();
  let recorded = false;
  for (let i = 0; i < n && !recorded; i += 1) {                                              // a planting whose waiting period is over (the demo has both kinds)
    await chips.nth(i).click();
    if ((await page.getByTestId('harvest-blocked').count()) > 0) continue;
    await page.getByTestId('harvest-more').first().click();
    await page.getByTestId('harvest-cutby-option').first().click();
    await page.getByTestId('harvest-save').click();
    await expect(page.getByTestId('harvest-saved')).toBeVisible();
    recorded = true;
  }
  expect(recorded).toBe(true);
  expect(await count(page, 'job_harvest')).toBe(before + 1);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();                                        // the worker's screen of the demo: «Σημερινές δουλειές»
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await page.getByRole('button', { name: /Έξοδος/ }).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('demo-load').click();                                               // «Επαναφορά επίδειξης»
  await expect(page.getByRole('status').filter({ hasText: /επίδειξη/i }).first()).toBeVisible();
  expect(await count(page, 'job_harvest')).toBe(before);                                     // exactly the original
});
