import { expect, test } from '@playwright/test';
import { athensDateTime, TEST_NOW } from '../helpers/clock';
import { fixClock } from './helpers/clock';
import { Server, mockFor, ownerInvitesWorker, signIn } from './helpers/mock-server';

// SQL 0038 (applied): on a REAL farm the worker's «Το αναλαμβάνω» is a queued server call (claim_job); the SERVER decides who is first. Winner: the job moves to «my jobs». Loser: «Someone else already took it». Against a MOCK server shared by two phones; nothing leaves the machine.
async function phones(browser: import('@playwright/test').Browser) {
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await Promise.all([fixClock(owner), fixClock(worker)]);
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');
  const farmId = await ownerInvitesWorker(owner, srv);
  const product = srv.all('products')[0]; const planting = srv.all('plantings')[0];
  const today = athensDateTime(Date.parse(TEST_NOW)).slice(0, 10);
  srv.put('jobs', { id: 'jobOpen', farm_id: farmId, kind: 'spray', status: 'planned', product_id: product!.id, dose_str: '0.025', dose_unit: 'ml/str', planned_for: today, created_at: TEST_NOW });
  srv.put('job_plantings', { id: 'jp-open', farm_id: farmId, job_id: 'jobOpen', planting_id: planting!.id, created_at: TEST_NOW });
  await worker.goto('/');
  await signIn(worker, 'worker@example.org');
  await expect(worker.getByTestId('worker-app')).toBeVisible();
  return { srv, worker, close: async () => { await ownerCtx.close(); await workerCtx.close(); } };
}

test('the worker takes an open job: the server says «claimed» and the job moves to «my jobs»', async ({ browser }) => {
  const { srv, worker, close } = await phones(browser);
  await expect(worker.getByTestId('worker-free-job')).toHaveCount(1, { timeout: 20_000 });
  await expect(worker.getByTestId('worker-job')).toHaveCount(0);
  await worker.getByTestId('worker-take').click();
  await expect.poll(() => srv.all('jobs').find((j) => j.id === 'jobOpen')?.worker_id, { timeout: 30_000 }).toBeTruthy();
  await expect(worker.getByTestId('worker-job')).toHaveCount(1, { timeout: 30_000 });
  await expect(worker.getByTestId('worker-free-job')).toHaveCount(0);
  await close();
});

test('somebody else was first: the server says «taken», the worker is told, and the job is not hers', async ({ browser }) => {
  const { srv, worker, close } = await phones(browser);
  await expect(worker.getByTestId('worker-free-job')).toHaveCount(1, { timeout: 20_000 });
  srv.put('jobs', { ...srv.all('jobs').find((j) => j.id === 'jobOpen')!, worker_id: 'someone-else' });      // another phone took it before this tap reached the server
  await worker.getByTestId('worker-take').click();
  await expect(worker.getByText('Την πήρε ήδη κάποιος άλλος.')).toBeVisible({ timeout: 30_000 });
  await expect(worker.getByTestId('worker-job')).toHaveCount(0);
  expect(srv.all('jobs').find((j) => j.id === 'jobOpen')?.worker_id).toBe('someone-else');
  await close();
});
