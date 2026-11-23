import { expect, test, type Page } from './helpers/test';
import { athensInput, fixClock } from './helpers/clock';

// A worker's own phone against a MOCK backend (the e2e build): the invitation is claimed at the first sign-in, the farm's id is taken, the server's rows arrive by pull and the worker
// sees only her own job. «Έγινε» is a call to the server (complete_spray_job): queued while there is no signal, sent when there is, and the job is then done on the server's side.
const F = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-11-20T06:00:00Z';
const GRANT = { access_token: 'a-w', refresh_token: 'r-w', expires_in: 3600, user: { id: 'u-worker', email: 'worker@example.org' } };
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

function rows(done: boolean) {
  const r = (table: string, row: Record<string, unknown>, seq: number) => ({ table, x: '5', seq, row: { farm_id: F, created_at: NOW, ...row } });
  return [
    r('workers', { id: 'w1', name: 'Δοκιμή', user_id: 'u-worker' }, 1), r('parcels', { id: 'pa1', name: 'Κάτω Κάμπος', area_str: '0.5' }, 2),
    r('crops', { id: 'c1', slug: 'spinach', name_el: 'Σπανάκι', name_tr: 'Ispanak', name_en: 'Spinach' }, 3), r('plantings', { id: 'pl1', crop_id: 'c1', parcel_id: 'pa1', area_str: '0.25', status: 'growing' }, 4),
    r('products', { id: 'pr1', name: 'Kocide 2000', type: 'fungicide', unit: 'kg' }, 5),
    r('jobs', { id: 'job1', kind: 'spray', status: done ? 'done' : 'planned', worker_id: 'w1', product_id: 'pr1', dose_str: '0.025', dose_unit: 'ml/str', planned_for: '2026-11-20', ...(done ? { done_at: NOW } : {}) }, 6),
    r('job_plantings', { id: 'jp1', job_id: 'job1', planting_id: 'pl1' }, 7),
  ];
}

async function mock(page: Page) {
  const state = { completions: [] as Array<Record<string, unknown>>, done: false };
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill(json({})));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill(json(GRANT)));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => r.fulfill(json({ farms: [F] })));
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => r.fulfill(json([])));
  await page.route('**/mock/rest/v1/rpc/pull', (r) => r.fulfill(json({ rows: rows(state.done), more: false, reset: false, cursor: { x: '9', s: state.done ? 2 : 1, g: 'g1', v: 'w' } })));
  await page.route('**/mock/rest/v1/rpc/complete_spray_job', (r) => { state.completions.push(JSON.parse(r.request().postData() ?? '{}')); state.done = true; return r.fulfill(json({ spray_id: 's1' })); });
  return state;
}

test('a worker\'s first sign-in: the farm is taken from the invitation, the roster and her job arrive, no owner screens, no «Δεν έγινε»', async ({ page }) => {
  await mock(page);
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill('worker@example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.locator('nav.tabs')).toHaveCount(0);
  await expect(page.getByTestId('worker-job')).toHaveCount(1);
  await expect(page.getByTestId('worker-job')).toContainText('Kocide 2000');
  await expect(page.getByTestId('worker-job')).toContainText('Σπανάκι');
  await expect(page.getByTestId('job-done')).toBeVisible();
  await expect(page.getByTestId('job-skip')).toHaveCount(0);   // the server has no «not done» yet: the demo-only button is not offered on a real farm
});

test('«Έγινε» without signal waits in the outbox and says so; with signal it goes to the server once, and the job is then done', async ({ page, context }) => {
  await fixClock(page);
  const state = await mock(page);
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill('worker@example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('worker-job')).toHaveCount(1);
  await context.setOffline(true);
  await page.getByTestId('job-done').click();
  await page.getByTestId('worker-start').fill(await athensInput(page, -3_600_000));
  await page.getByTestId('job-confirm').click();
  // 10 seconds to take it back, then it is queued
  await expect(page.getByTestId('worker-waiting')).toContainText('Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα', { timeout: 20000 });
  await expect(page.getByTestId('worker-job')).toHaveCount(0);
  expect(state.completions).toHaveLength(0);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByTestId('worker-finished')).toHaveCount(1, { timeout: 20000 });
  expect(state.completions).toHaveLength(1);
  expect(Object.keys(state.completions[0]!).sort()).toEqual(['p_job', 'p_late_reason', 'p_ended_at', 'p_started_at', 'p_note'].sort());
  expect(state.completions[0]).toMatchObject({ p_job: 'job1', p_note: null, p_late_reason: null });
});
