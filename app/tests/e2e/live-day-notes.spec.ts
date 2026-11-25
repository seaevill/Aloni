import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';
import { Server, mockFor, ownerInvitesWorker, signIn } from './helpers/mock-server';

// SQL 0039 (applied): notes for the next days are shared between phones. The owner's note reaches the worker; the worker's note reaches the owner tagged «από εργάτη», and that tag is set by the SERVER from the writer's role (the phone never sends it). Against a MOCK server shared by two phones.
test('owner and worker share notes for tomorrow; the worker one is tagged by the server', async ({ browser }) => {
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await Promise.all([fixClock(owner), fixClock(worker)]);
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');
  await ownerInvitesWorker(owner, srv);
  await owner.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0039', advisor: true } }); tx.oncomplete = () => ok(); }; }));
  await owner.evaluate(() => { location.hash = '#/own/today/sheet/jobs/all'; });
  await owner.reload();
  const sheet = owner.getByTestId('sheet-jobs');
  await sheet.getByTestId('note-text').fill('Ποτίστε το σπανάκι');
  await sheet.getByTestId('note-add').click();
  await expect.poll(() => srv.all('day_notes').length, { timeout: 30_000 }).toBe(1);
  expect(srv.all('day_notes')[0]).toMatchObject({ text: 'Ποτίστε το σπανάκι', from_worker: false });
  expect('from_worker' in ((await owner.evaluate(() => new Promise<Record<string, unknown>>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('outbox').objectStore('outbox').getAll(); q.onsuccess = () => res((q.result as Array<{ table: string; row: Record<string, unknown> }>).find((o) => o.table === 'day_notes')!.row); }; }))))).toBe(false);   // the phone never sends it

  await worker.goto('/');
  await signIn(worker, 'worker@example.org');
  await expect(worker.getByTestId('worker-app')).toBeVisible();
  await expect(worker.getByTestId('note').filter({ hasText: 'Ποτίστε το σπανάκι' })).toBeVisible({ timeout: 30_000 });
  await expect(worker.getByTestId('note-by-worker')).toHaveCount(0);
  await worker.getByTestId('note-text').fill('Να φέρουμε κλούβες');
  await worker.getByTestId('note-add').click();
  await expect.poll(() => srv.all('day_notes').length, { timeout: 30_000 }).toBe(2);
  expect(srv.all('day_notes').find((n) => n.text === 'Να φέρουμε κλούβες')).toMatchObject({ from_worker: true });
  await owner.evaluate(() => window.dispatchEvent(new Event('online')));
  await owner.reload();
  await expect(owner.getByTestId('sheet-jobs').getByTestId('note').filter({ hasText: 'Να φέρουμε κλούβες' }).getByTestId('note-by-worker')).toBeVisible({ timeout: 30_000 });
  await ownerCtx.close(); await workerCtx.close();
});
