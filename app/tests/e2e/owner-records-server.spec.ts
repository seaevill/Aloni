import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

const count = (page: import('@playwright/test').Page, store: string) => page.evaluate((s) => new Promise<number>((res) => {
  const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).count(); q.onsuccess = () => res(q.result); };
}), store);

test('once the owner confirmed 0037: customers, orders and the worker card are server rows (queued for sync), and the «only on this phone» line is gone', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0037' } }); tx.oncomplete = () => ok(); }; }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-customers').click();
  await expect(page.getByTestId('customers')).toBeVisible();
  await expect(page.getByText('Αποθηκεύεται μόνο σε αυτό το τηλέφωνο')).toHaveCount(0);
  await page.getByTestId('customer-add').click();
  await page.getByTestId('customer-name').fill('Μαρία Παπά');
  await page.getByTestId('customer-save').click();
  await expect.poll(() => count(page, 'customers')).toBe(1);
  await page.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await page.getByTestId('order-crop-spinach').click();
  await page.getByTestId('order-crates').fill('7');
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-saved')).toBeVisible();
  await expect(page.getByTestId('customer-order')).toContainText('7 κλούβες');
  expect(await count(page, 'customer_orders')).toBe(1);
  const queued = await page.evaluate(() => new Promise<string[]>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('outbox').objectStore('outbox').getAll(); q.onsuccess = () => res((q.result as Array<{ table: string }>).map((o) => o.table)); }; }));
  expect(queued).toContain('customers'); expect(queued).toContain('customer_orders');
});
