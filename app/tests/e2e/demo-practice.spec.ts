import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T14: the demo farm is writable (practice) and can be reset; nothing of it is queued for sync.
test('demo: «Νέος ψεκασμός» opens, a job can be planned, and «Επαναφορά επίδειξης» restores the original', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.getByTestId('spray-open').click();
  await expect(page.getByTestId('spray-save')).toBeVisible();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.getByTestId('job-open').click();
  await page.getByRole('button', { name: 'Ακύρωση' }).first().click().catch(() => undefined);
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
