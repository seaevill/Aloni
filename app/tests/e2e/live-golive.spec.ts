import { expect, test, type Page } from '@playwright/test';

// The go-live wizard against the MOCK backend (the e2e build): the button is closed until every item is ok; signing in alone sends NOTHING; pressing it sends an empty call first, then
// the queued records, then pulls; a server error switches nothing on.
const GRANT = { access_token: 'a-owner', refresh_token: 'r-owner', expires_in: 3600, user: { id: 'u-owner', email: 'bora@example.org' } };
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mock(page: Page, applyStatus = 200): Promise<{ applied: Array<Array<{ table: string }>>; pulls: number }> {
  const seen = { applied: [] as Array<Array<{ table: string }>>, pulls: 0 };
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill(json({})));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill(json(GRANT)));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => r.fulfill(json({ code: 'P0002', message: 'there is no open invitation' }, 404)));
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => {
    const ops = (JSON.parse(r.request().postData() ?? '{}') as { p_ops: Array<{ op_id: string; table: string }> }).p_ops;
    seen.applied.push(ops);
    return applyStatus === 200 ? r.fulfill(json(ops.map((o) => ({ op_id: o.op_id, status: 'applied' })))) : r.fulfill(json({ message: 'boom' }, applyStatus));
  });
  await page.route('**/mock/rest/v1/rpc/pull', (r) => { seen.pulls += 1; return r.fulfill(json({ rows: [], more: false, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } })); });
  return seen;
}

async function prepare(page: Page) {
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος'); await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  // everything the wizard asks for, written straight into the phone's settings (the screens that do it are tested elsewhere)
  await page.evaluate(() => new Promise<void>((done) => {
    const r = indexedDB.open('aloni');
    r.onsuccess = () => {
      const tx = r.result.transaction('settings', 'readwrite'); const s = tx.objectStore('settings');
      s.put({ key: 'controller', value: { name: 'Bora', address: 'Megara', phone: '210' } });
      s.put({ key: 'business', value: { vat_id: '123456789', farm_name: 'Bora farm' } });
      s.put({ key: 'readiness', value: { migration: '0026', advisor: true } });
      s.put({ key: 'last_backup_at', value: new Date().toISOString() });
      tx.oncomplete = () => done();
    };
  }));
  await page.reload();
}

async function signIn(page: Page) {
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill('bora@example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('signed-in')).toBeVisible();
}

test('the button is closed until everything is ok; signing in sends nothing; pressing it sends an empty call, then the records, then pulls; the switch stays on after a reload', async ({ page }) => {
  const seen = await mock(page);
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('golive-start')).toBeDisabled();                 // nothing is ready yet
  await prepare(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('golive-start')).toBeDisabled();                 // not signed in yet
  await expect(page.getByTestId('golive-signed_in')).toHaveAttribute('data-ok', 'no');
  await signIn(page);
  await page.waitForTimeout(500);
  expect(seen.applied).toHaveLength(0);                                          // signed in, switch off: NOTHING was sent
  await expect(page.getByTestId('golive-start')).toBeEnabled();
  await page.getByTestId('golive-start').click();
  await expect(page.getByTestId('golive-on')).toBeVisible();
  await expect(page.getByTestId('sync-chip')).toContainText('τελευταίος', { timeout: 15_000 });      // B5: after a round that WORKED the chip shows its clock time (and nothing is claimed before that)
  expect(seen.applied[0]).toHaveLength(0);                                       // the empty call first
  expect(seen.applied.flat().map((o) => o.table)).toContain('parcels');          // then the record
  expect(seen.pulls).toBeGreaterThan(0);
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('golive-on')).toBeVisible();                     // the switch is remembered
});

test('a server error switches nothing on, says so in plain words, and keeps the data', async ({ page }) => {
  await mock(page, 500);
  await prepare(page);
  await signIn(page);
  await page.getByTestId('golive-start').click();
  await expect(page.getByTestId('golive-failed')).toBeVisible();
  await expect(page.getByTestId('golive-on')).toHaveCount(0);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('main .card').first()).toContainText('Κάτω Κάμπος');   // the data is still on the phone
});

// B5: «back up first» is ONE tap in the wizard, not a trip to another screen.
test('without a fresh backup the wizard offers «Αντίγραφο τώρα»: one tap downloads the backup and opens the button', async ({ page }) => {
  await mock(page);
  await prepare(page);
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').delete('last_backup_at'); tx.oncomplete = () => done(); }; }));
  await page.goto('/');
  await signIn(page);
  await expect(page.getByTestId('golive-backup')).toHaveAttribute('data-ok', 'no');
  await expect(page.getByTestId('golive-start')).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByTestId('golive-backup-now').click();
  expect((await download).suggestedFilename()).toMatch(/^aloni-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByTestId('golive-backup')).toHaveAttribute('data-ok', 'yes');
  await expect(page.getByTestId('golive-start')).toBeEnabled();
  await expect(page.getByTestId('golive-backup-now')).toHaveCount(0);                         // nothing to offer once the backup is fresh
});
