import { expect, test } from './helpers/test';
import { Server, mockFor, ownerInvitesWorker, signIn } from './helpers/mock-server';

// Tasks cycle against the shared mock server (two phones): the owner plans and assigns a spray job on Σήμερα → «Εργασίες» ->
// it reaches the worker's phone (her own job only) -> she taps «Έγινε», writes only when it started and ended (product, dose and crop are fixed by the owner and cannot be typed again) ->
// the server writes the record -> the job leaves the owner's open list and appears under «Έγιναν σήμερα».
test('the owner assigns a job, the worker does it without retyping anything, it lands in the owner\'s «done today»', async ({ browser }) => {
  test.setTimeout(120_000);
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');
  await ownerInvitesWorker(owner, srv);

  // 1. the owner plans the job (nothing is typed twice: the label's own dose is one tap) and assigns it to Γιώργος
  await owner.locator('nav.tabs [data-tab="today"]').click();
  await owner.getByTestId('job-open').click();
  await owner.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await owner.getByRole('button', { name: 'Kocide 2000' }).click();
  await owner.getByTestId('job-dose-same').click();
  await owner.getByRole('button', { name: 'Γιώργος' }).click();
  await owner.getByTestId('job-save').click();
  await expect(owner.getByTestId('job-planned')).toHaveCount(1);
  await expect(owner.getByTestId('jobs-count-today')).toHaveText('1');            // the group heading counts its jobs
  await owner.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => srv.all('jobs').filter((j) => j.status === 'planned').length, { timeout: 30_000 }).toBe(1);

  // 2. the worker signs in: her job is there with the fixed values; she only confirms
  await worker.goto('/');
  await signIn(worker, 'worker@example.org');
  await expect(worker.getByTestId('worker-job')).toHaveCount(1, { timeout: 30_000 });
  await expect(worker.getByTestId('worker-job')).toContainText('Kocide 2000');
  await expect(worker.getByTestId('worker-dose')).toContainText('0,025');
  await worker.getByTestId('job-done').click();
  const athens = (offsetMin: number) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens', dateStyle: 'short', timeStyle: 'short' }).format(new Date(Date.now() + offsetMin * 60_000)).replace(' ', 'T');
  await worker.getByTestId('worker-start').fill(athens(-40));                // the start is never filled in for her: she writes when it began
  await worker.locator('input[type="datetime-local"]').nth(1).fill(athens(-5));
  await worker.getByTestId('job-confirm').click();
  await expect.poll(async () => { await worker.evaluate(() => window.dispatchEvent(new Event('online'))); return srv.all('jobs').filter((j) => j.status === 'done').length; }, { timeout: 60_000, intervals: [2_000] }).toBe(1);   // after the 10 s undo window the call reaches the server
  expect(srv.all('job_spray')).toHaveLength(1);

  // 3. back on the owner's phone: no open job, one under «Έγιναν σήμερα»
  // a sync round already running swallows ONE «online» event (WebKit is slower than Chromium here): ask again until the owner's phone has pulled the finished job
  await expect(async () => { await owner.evaluate(() => window.dispatchEvent(new Event('online'))); await expect(owner.getByTestId('jobs-done')).toBeVisible({ timeout: 3_000 }); }).toPass({ timeout: 45_000, intervals: [1_000] });
  await expect(owner.getByTestId('job-planned')).toHaveCount(0);
  await ownerCtx.close(); await workerCtx.close();
});
