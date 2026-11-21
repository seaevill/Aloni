import { expect, test, type Page } from '@playwright/test';

// E3 sync trust: every record says where it is. A parcel the server confirmed says «στάλθηκε»; a parcel written in airplane mode says «μη συγχρονισμένο» and flips to «στάλθηκε» when the signal comes back;
// one the server refuses says «δεν έγινε δεκτό» and a tap opens the plain explanation (what, why, what to do, and that it is still on the phone). Against the MOCK backend (nothing leaves the machine).
test.use({ viewport: { width: 375, height: 812 } });
const GRANT = { access_token: 'a-owner', refresh_token: 'r-owner', expires_in: 3600, user: { id: 'u-owner', email: 'bora@example.org' } };
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mock(page: Page, refuse: RegExp | undefined = undefined) {
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill(json({})));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill(json(GRANT)));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => r.fulfill(json({ code: 'P0002', message: 'there is no open invitation' }, 404)));
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => {
    const ops = (JSON.parse(r.request().postData() ?? '{}') as { p_ops: Array<{ op_id: string; row?: { name?: string } }> }).p_ops;
    return r.fulfill(json(ops.map((o) => (refuse && refuse.test(String(o.row?.name)) ? { op_id: o.op_id, status: 'rejected', code: 'P0001', reason: 'harvest blocked: the waiting period is not over' } : { op_id: o.op_id, status: 'applied' }))));
  });
  await page.route('**/mock/rest/v1/rpc/pull', (r) => r.fulfill(json({ rows: [], more: false, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } })));
}

async function addParcel(page: Page, name: string) {
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.locator('[data-testid="empty-state"], [data-testid="parcel-add"]').first().waitFor();      // the list has loaded: either «add a field» in the empty state or the add button
  if (await page.getByTestId('empty-state').count()) await page.getByTestId('empty-state').locator('button').click(); else await page.getByTestId('parcel-add').click();
  await page.locator('input.input').nth(0).fill(name); await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
}

async function goLive(page: Page) {
  await page.goto('/');
  await addParcel(page, 'Κάτω Κάμπος');
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); const s = tx.objectStore('settings'); s.put({ key: 'controller', value: { name: 'Bora', address: 'Megara', phone: '210' } }); s.put({ key: 'business', value: { vat_id: '123456789', farm_name: 'Bora farm' } }); s.put({ key: 'readiness', value: { migration: '0034', advisor: true } }); s.put({ key: 'last_backup_at', value: new Date().toISOString() }); tx.oncomplete = () => done(); }; }));
  await page.waitForLoadState('networkidle');      // the first load (and its service worker) is finished before the page is loaded again
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('sign-in').locator('input').first().fill('bora@example.org'); await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456'); await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('signed-in')).toBeVisible();
  await page.getByTestId('golive-start').click();
  await expect(page.getByTestId('golive-on')).toBeVisible();
}

test('airplane mode: a record says «on the phone», then «sent» when the signal returns', async ({ page, context }) => {
  await mock(page);
  await goLive(page);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('mark-sent')).toHaveCount(1);                       // the first parcel reached the server
  await expect(page.getByTestId('mark-sent')).toContainText('στάλθηκε');
  await context.setOffline(true);
  await addParcel(page, 'Νέο χωράφι');
  await expect(page.getByTestId('mark-phone')).toHaveCount(1);                      // written without signal: still only on the phone
  await expect(page.getByTestId('mark-phone')).toContainText('μη συγχρονισμένο');
  await context.setOffline(false);
  await expect(page.getByTestId('mark-sent')).toHaveCount(2, { timeout: 20_000 }); // the signal is back: it was sent
  await expect(page.getByTestId('mark-phone')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('a refused record says so; a tap explains it in plain Greek and says it is still on the phone', async ({ page }) => {
  await mock(page, /Απορριφθέν/);
  await goLive(page);
  await addParcel(page, 'Απορριφθέν χωράφι');
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  const mark = page.getByTestId('mark-rejected');
  await expect(mark).toHaveCount(1, { timeout: 20_000 });
  expect((await mark.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await mark.click();
  const sheet = page.getByTestId('sheet-refused');
  await expect(sheet.getByTestId('refused-why')).toContainText('Η συγκομιδή είναι κλειστή');
  await expect(sheet.getByTestId('refused-fix')).toBeVisible();
  await expect(sheet).toContainText('παραμένει στο τηλέφωνο');
  await expect(sheet.getByTestId('refused-raw')).toContainText('harvest blocked');   // the server's own words stay visible
  await page.getByTestId('sheet-close').click();
  await expect(page.getByText('Απορριφθέν χωράφι').first()).toBeVisible();          // nothing was lost
});
