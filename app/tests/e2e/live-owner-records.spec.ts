import { expect, test } from './helpers/test';
import { fixClock } from './helpers/clock';
import { Server, mockFor, ownerInvitesWorker, signIn } from './helpers/mock-server';

// Owner-only records (customers, their orders) reach the SERVER once the owner confirmed 0037, and a worker's phone never receives them (against a MOCK server; nothing leaves the machine).
const idbCount = (page: import('@playwright/test').Page, store: string) => page.evaluate((s) => new Promise<number>((res) => {
  const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).count(); q.onsuccess = () => res(q.result); };
}), store);

test('owner adds a customer and an order -> both reach the server -> the worker phone gets none of it', async ({ browser }) => {
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await Promise.all([fixClock(owner), fixClock(worker)]);
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');
  const farmId = await ownerInvitesWorker(owner, srv);

  // the owner confirms that 0037 is applied (readiness card), then writes a customer and an order
  await owner.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0037', advisor: true } }); tx.oncomplete = () => ok(); }; }));
  await owner.reload();
  await owner.locator('nav.tabs [data-tab="more"]').click();
  await owner.getByTestId('open-customers').click();
  await expect(owner.getByText('Αποθηκεύεται μόνο σε αυτό το τηλέφωνο')).toHaveCount(0);
  await owner.getByTestId('customer-add').click();
  await owner.getByTestId('customer-name').fill('Μαρία Παπά');
  await owner.getByTestId('customer-save').click();
  await owner.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await owner.getByTestId('order-crop-spinach').click();
  await owner.getByTestId('order-crates').fill('7');
  await owner.getByTestId('order-save').click();
  await expect(owner.getByTestId('order-saved')).toBeVisible();

  await expect.poll(() => srv.all('customers').length, { timeout: 30_000 }).toBe(1);
  await expect.poll(() => srv.all('customer_orders').length, { timeout: 30_000 }).toBe(1);
  expect(srv.all('customers')[0]).toMatchObject({ farm_id: farmId, name: 'Μαρία Παπά' });
  expect(srv.all('customer_orders')[0]).toMatchObject({ farm_id: farmId, crates_str: '7', customer_id: srv.all('customers')[0].id });

  // the worker phone signs in: she gets her own screens, and nothing of the owner's records
  await worker.goto('/');
  await signIn(worker, 'worker@example.org');
  await expect(worker.getByTestId('worker-app')).toBeVisible();
  await expect.poll(() => idbCount(worker, 'jobs').catch(() => -1), { timeout: 20_000 }).toBeGreaterThanOrEqual(0);
  expect(await idbCount(worker, 'customers')).toBe(0);
  expect(await idbCount(worker, 'customer_orders')).toBe(0);
  await ownerCtx.close(); await workerCtx.close();
});
