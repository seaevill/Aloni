import { expect, test, type Page } from '@playwright/test';
import { setup } from './helpers/farm';

// B7: the whole worker story against a MOCK server shared by TWO phones (the e2e build; nothing leaves the machine):
// the owner invites a roster worker by e-mail -> the worker signs in with that e-mail and sees ONLY her own job -> she records a harvest ->
// it reaches the owner's phone («Σήμερα → Ποιος έκανε τι»). The mock keeps the rows the phones send and answers pulls the way row-level security would (a worker gets her own jobs only).
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
type Row = Record<string, unknown>;

class Server {
  rows = new Map<string, { table: string; row: Row; seq: number }>(); seq = 0; invitations: Array<{ email: string; farm_id: string }> = [];
  put(table: string, row: Row): void { this.rows.set(`${table}:${String(row.id)}`, { table, row, seq: (this.seq += 1) }); }
  all(table: string): Row[] { return [...this.rows.values()].filter((r) => r.table === table).map((r) => r.row); }
  visibleTo(role: 'owner' | 'worker', workerId: string | undefined) {
    const mine = new Set(this.all('jobs').filter((j) => j.worker_id === workerId).map((j) => String(j.id)));
    const WORKER_TABLES = new Set(['workers', 'parcels', 'crops', 'plantings', 'products', 'jobs', 'job_plantings', 'job_harvest']);
    return [...this.rows.values()].filter((r) => role === 'owner' || (WORKER_TABLES.has(r.table) && (r.table !== 'jobs' || mine.has(String(r.row.id))) && (r.table !== 'job_plantings' || mine.has(String(r.row.job_id)))));
  }
}

async function mockFor(page: Page, srv: Server, role: 'owner' | 'worker', email: string) {
  const grant = { access_token: `a-${role}`, refresh_token: `r-${role}`, expires_in: 3600, user: { id: `u-${role}`, email } };
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill(json({})));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill(json(grant)));
  await page.route('**/mock/rest/v1/farm_members*', (r) => r.fulfill(json(role === 'owner' ? [] : [{ farm_id: 'x' }])));
  await page.route('**/mock/rest/v1/invitations', async (r) => { srv.invitations.push(JSON.parse(r.request().postData() ?? '{}') as { email: string; farm_id: string }); await r.fulfill({ status: 201, body: '' }); });
  await page.route('**/mock/rest/v1/invitations?*', (r) => r.fulfill(json([])));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => {
    const inv = srv.invitations.find((i) => i.email === email);
    if (!inv) return r.fulfill(json({ code: 'P0002', message: 'there is no open invitation for this account' }, 404));
    const w = srv.all('workers').find((x) => x.name === 'Γιώργος');
    if (w) srv.put('workers', { ...w, user_id: 'u-worker' });                                   // the server links the account to the roster worker
    return r.fulfill(json({ farms: [inv.farm_id] }));
  });
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => {
    const ops = (JSON.parse(r.request().postData() ?? '{}') as { p_ops: Array<{ op_id: string; table: string; row: Row }> }).p_ops;
    for (const o of ops) srv.put(o.table === 'settings' ? 'farm_settings' : o.table, o.row);
    return r.fulfill(json(ops.map((o) => ({ op_id: o.op_id, status: 'applied' }))));
  });
  await page.route('**/mock/rest/v1/rpc/pull', (r) => {
    const wid = srv.all('workers').find((x) => x.user_id === 'u-worker')?.id as string | undefined;
    const rows = srv.visibleTo(role, wid).map((x) => ({ table: x.table, x: '5', seq: x.seq, row: x.row }));
    return r.fulfill(json({ rows, more: false, reset: false, cursor: { x: '9', s: srv.seq, g: 'g1', v: role } }));
  });
}

async function signIn(page: Page, email: string) {
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill(email);
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
}

test('owner invites -> worker signs in and sees only her own job -> records a harvest -> it reaches the owner', async ({ browser }) => {
  const srv = new Server();
  const ownerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const workerCtx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const owner = await ownerCtx.newPage(); const worker = await workerCtx.newPage();
  await mockFor(owner, srv, 'owner', 'bora@example.org'); await mockFor(worker, srv, 'worker', 'worker@example.org');

  // 1. the owner's farm: parcel, planting, product with a signed label, the worker «Γιώργος» (the helper), then the controller details the wizard and the invitation need
  await owner.goto('/');
  await setup(owner, true);
  await owner.evaluate(() => new Promise<void>((done) => {
    const r = indexedDB.open('aloni');
    r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); const s = tx.objectStore('settings');
      s.put({ key: 'controller', value: { name: 'Bora', address: 'Megara', phone: '210' } }); s.put({ key: 'business', value: { vat_id: '123456789', farm_name: 'Bora farm' } });
      s.put({ key: 'readiness', value: { migration: '0034', advisor: true } }); s.put({ key: 'last_backup_at', value: new Date().toISOString() });
      tx.oncomplete = () => done(); };
  }));
  await owner.goto('/');
  await signIn(owner, 'bora@example.org');
  await expect(owner.getByTestId('signed-in')).toBeVisible();
  const farmId = (await owner.getByTestId('farm-id').innerText()).replace(/^.*?:\s*/, '').trim();
  await owner.getByTestId('golive-start').click();
  await expect(owner.getByTestId('golive-on')).toBeVisible();
  await owner.getByTestId('open-workers').click();
  await owner.locator('[data-testid="worker"]').filter({ hasText: 'Γιώργος' }).locator('input[type=email]').fill('worker@example.org');
  await owner.locator('[data-testid="worker"]').filter({ hasText: 'Γιώργος' }).getByTestId('invite-send').click();
  await expect(owner.getByText('Η πρόσκληση αποθηκεύτηκε')).toBeVisible();
  expect(srv.invitations).toHaveLength(1);
  expect(srv.invitations[0]).toMatchObject({ email: 'worker@example.org', farm_id: farmId });

  // 2. the server holds two jobs: one for Γιώργος, one for somebody else
  const george = srv.all('workers').find((w) => w.name === 'Γιώργος');
  const product = srv.all('products')[0]; const planting = srv.all('plantings')[0];
  expect(george && product && planting).toBeTruthy();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date());
  for (const [id, workerId] of [['jobMine', george!.id], ['jobOther', 'someone-else']] as const) {
    srv.put('jobs', { id, farm_id: farmId, kind: 'spray', status: 'planned', worker_id: workerId, product_id: product!.id, dose_str: '0.025', dose_unit: 'ml/str', planned_for: today, created_at: new Date().toISOString() });
    srv.put('job_plantings', { id: `jp-${id}`, farm_id: farmId, job_id: id, planting_id: planting!.id, created_at: new Date().toISOString() });
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
  await worker.getByTestId('harvest-save').click();
  await expect.poll(() => srv.all('job_harvest').length, { timeout: 30_000 }).toBe(1);        // it reached the server
  expect(srv.all('job_harvest')[0]).toMatchObject({ planting_id: planting!.id, cut_by: george!.id, crates_str: '1' });   // her own roster entry is the cutter, one crate exactly

  // 5. the owner's phone pulls it: «Ποιος έκανε τι» shows the crates
  await owner.evaluate(() => window.dispatchEvent(new Event('online')));
  await owner.locator('nav.tabs [data-tab="today"]').click();
  await expect(owner.getByTestId('today-who-crates')).toBeVisible({ timeout: 30_000 });
  await ownerCtx.close(); await workerCtx.close();
});
