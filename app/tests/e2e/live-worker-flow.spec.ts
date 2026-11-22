import { expect, test, type Page } from '@playwright/test';
import { athensDateTime, TEST_NOW } from '../helpers/clock';
import { fixClock } from './helpers/clock';
import { setup } from './helpers/farm';
import { Server, mockFor, ownerInvitesWorker, signIn } from './helpers/mock-server';

// B7: the whole worker story against a MOCK server shared by TWO phones (the e2e build; nothing leaves the machine):
// the owner invites a roster worker by e-mail -> the worker signs in with that e-mail and sees ONLY her own job -> she records a harvest ->
// it reaches the owner's phone («Σήμερα → Ποιος έκανε τι»). The mock keeps the rows the phones send and answers pulls the way row-level security would (a worker gets her own jobs only).
test('owner invites -> worker signs in and sees only her own job -> records a harvest -> it reaches the owner', async ({ browser }) => {
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await Promise.all([fixClock(owner), fixClock(worker)]);
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');

  const farmId = await ownerInvitesWorker(owner, srv);

  // 2. the server holds two jobs: one for Γιώργος, one for somebody else
  const george = srv.all('workers').find((w) => w.name === 'Γιώργος');
  const product = srv.all('products')[0]; const planting = srv.all('plantings')[0];
  expect(george && product && planting).toBeTruthy();
  const today = athensDateTime(Date.parse(TEST_NOW)).slice(0, 10);
  for (const [id, workerId] of [['jobMine', george!.id], ['jobOther', 'someone-else']] as const) {
    srv.put('jobs', { id, farm_id: farmId, kind: 'spray', status: 'planned', worker_id: workerId, product_id: product!.id, dose_str: '0.025', dose_unit: 'ml/str', planned_for: today, created_at: TEST_NOW });
    srv.put('job_plantings', { id: `jp-${id}`, farm_id: farmId, job_id: id, planting_id: planting!.id, created_at: TEST_NOW });
  }

  // 3. the worker signs in with the invited e-mail: the farm is taken from the invitation, only HER job arrives, no owner screens
  await worker.goto('/');
  await signIn(worker, 'worker@example.org');
  await expect(worker.getByTestId('worker-app')).toBeVisible();
  await expect(worker.locator('nav.tabs')).toHaveCount(0);
  await expect(worker.getByTestId('worker-job')).toHaveCount(1, { timeout: 20_000 });
  await expect(worker.getByTestId('worker-job')).toContainText('Kocide 2000');

  // 4. she records a harvest (a planting that was never sprayed): +1 crate, who cut = herself
  await worker.getByTestId('worker-tab-harvest').click();
  await worker.getByTestId('harvest-chip').first().click();
  await worker.getByTestId('harvest-more').first().click();
  await worker.getByTestId('harvest-dest-store').click();
  await worker.getByTestId('harvest-save').click();
  await expect.poll(() => srv.all('job_harvest').length, { timeout: 30_000 }).toBe(1);        // it reached the server
  expect(srv.all('job_harvest')[0]).toMatchObject({ planting_id: planting!.id, cut_by: george!.id, crates_str: '1' });   // her own roster entry is the cutter, one crate exactly

  // 5. the owner's phone pulls it: «Ποιος έκανε τι» shows the crates
  await owner.evaluate(() => window.dispatchEvent(new Event('online')));
  await owner.locator('nav.tabs [data-tab="today"]').click();
  await expect(owner.getByTestId('today-done-row').filter({ hasText: 'Συγκομιδή' })).toBeVisible({ timeout: 30_000 });
  await ownerCtx.close(); await workerCtx.close();
});
