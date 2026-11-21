import { expect, type Page } from '@playwright/test';
import { setup } from './farm';

// Shared by the live two-phone specs: a MOCK server shared by an owner phone and a worker phone (nothing leaves the machine).
export const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
export type Row = Record<string, unknown>;

export class Server {
  rows = new Map<string, { table: string; row: Row; seq: number }>(); seq = 0; invitations: Array<{ email: string; farm_id: string }> = [];
  put(table: string, row: Row): void { this.rows.set(`${table}:${String(row.id)}`, { table, row, seq: (this.seq += 1) }); }
  all(table: string): Row[] { return [...this.rows.values()].filter((r) => r.table === table).map((r) => r.row); }
  visibleTo(role: 'owner' | 'worker', workerId: string | undefined) {
    const mine = new Set(this.all('jobs').filter((j) => j.worker_id === workerId).map((j) => String(j.id)));
    const WORKER_TABLES = new Set(['workers', 'parcels', 'crops', 'plantings', 'products', 'jobs', 'job_plantings', 'job_harvest']);
    return [...this.rows.values()].filter((r) => role === 'owner' || (WORKER_TABLES.has(r.table) && (r.table !== 'jobs' || mine.has(String(r.row.id))) && (r.table !== 'job_plantings' || mine.has(String(r.row.job_id)))));
  }
}

export async function mockFor(page: Page, srv: Server, role: 'owner' | 'worker', email: string) {
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
  await page.route('**/mock/rest/v1/rpc/complete_spray_job', (r) => {
    const a = JSON.parse(r.request().postData() ?? '{}') as { p_job: string; p_ended_at: string; p_started_at: string };
    const job = srv.all('jobs').find((j) => j.id === a.p_job);
    if (!job || job.status !== 'planned') return r.fulfill(json({ code: 'P0001', message: 'job is not open' }, 400));
    srv.put('jobs', { ...job, status: 'done', done_at: a.p_ended_at });
    srv.put('job_spray', { id: `spray-${a.p_job}`, farm_id: job.farm_id, job_id: a.p_job, sprayed_at: a.p_ended_at, started_at: a.p_started_at });
    return r.fulfill(json({ spray_id: `spray-${a.p_job}` }));
  });
  await page.route('**/mock/rest/v1/rpc/pull', (r) => {
    const wid = srv.all('workers').find((x) => x.user_id === 'u-worker')?.id as string | undefined;
    const rows = srv.visibleTo(role, wid).map((x) => ({ table: x.table, x: '5', seq: x.seq, row: x.row }));
    return r.fulfill(json({ rows, more: false, reset: false, cursor: { x: '9', s: srv.seq, g: 'g1', v: role } }));
  });
}

export async function signIn(page: Page, email: string) {
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill(email);
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
}


/** The owner's real farm (parcel, planting, signed product, worker «Γιώργος»), signed in, sync on, the worker invited by e-mail. Returns the farm id. */
export async function ownerInvitesWorker(owner: Page, srv: Server): Promise<string> {
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

  return farmId;
}
