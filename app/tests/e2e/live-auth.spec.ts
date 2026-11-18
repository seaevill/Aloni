import { expect, test, type Page } from '@playwright/test';

// The live features against a MOCK backend (the e2e build, port 4174): e-mail code sign-in and the owner's invitation of a worker.
// The mock answers what Supabase would; nothing leaves the machine.
const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const GRANT = { access_token: 'a-owner', refresh_token: 'r-owner', expires_in: 3600, user: { id: 'u-owner', email: 'bora@example.org' } };

async function mockBackend(page: Page): Promise<{ invitations: unknown[] }> {
  const seen = { invitations: [] as unknown[] };
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GRANT) }));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"P0002","message":"there is no open invitation for this account"}' }));
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/mock/rest/v1/rpc/pull', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [], more: false, reset: false, cursor: { x: '1', s: 1, g: 'g1', v: 'owner' } }) }));
  await page.route('**/mock/rest/v1/invitations', async (r) => { seen.invitations.push(JSON.parse(r.request().postData() ?? '{}')); await r.fulfill({ status: 201, body: '' }); });
  return seen;
}

async function signIn(page: Page) {
  await tab(page, 'more');
  await page.getByTestId('signin-send').scrollIntoViewIfNeeded();
  await page.getByTestId('sign-in').locator('input').first().fill('Bora@Example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('signed-in')).toContainText('bora@example.org');
}

test('sign-in with an e-mail code: the card shows who is signed in; the session survives a reload', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await signIn(page);
  await page.reload();
  await tab(page, 'more');
  await expect(page.getByTestId('signed-in')).toContainText('bora@example.org');
  await page.getByRole('button', { name: 'Αποσύνδεση' }).click();
  await expect(page.getByTestId('sign-in')).toBeVisible();
});

test('a wrong code is refused with a calm message and nothing is stored', async ({ page }) => {
  await mockBackend(page);
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"bad code"}' }));
  await page.goto('/');
  await tab(page, 'more');
  await page.getByTestId('sign-in').locator('input').first().fill('bora@example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('000000');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByRole('alert')).toContainText('Η σύνδεση δεν πέτυχε');
  await expect(page.getByTestId('signed-in')).toHaveCount(0);
});

test('inviting a worker: closed until the data controller details are entered, then one invitation goes out with the farm, the address and the roster worker', async ({ page }) => {
  const seen = await mockBackend(page);
  await page.goto('/');
  await signIn(page);
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').fill('Δοκιμή');
  await page.getByTestId('worker-add').click();
  await expect(page.getByTestId('invite-closed')).toBeVisible();
  // the details (once), then back to the roster
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('open-info').click();
  const inputs = page.locator('input.input');
  await inputs.nth(0).fill('Test Person'); await inputs.nth(1).fill('Test street 1'); await inputs.nth(2).fill('+30 000 0000000');
  await page.getByRole('button', { name: 'Αποθήκευση' }).click();
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('open-workers').click();
  await expect(page.getByTestId('invite-closed')).toHaveCount(0);
  await page.getByTestId('worker').locator('input[type="email"]').fill('Worker@Example.org');
  await page.getByTestId('invite-send').click();
  await expect(page.getByText('Η πρόσκληση αποθηκεύτηκε')).toBeVisible();
  expect(seen.invitations).toHaveLength(1);
  expect(seen.invitations[0]).toMatchObject({ email: 'worker@example.org' });
  expect(Object.keys(seen.invitations[0] as object).sort()).toEqual(['email', 'farm_id', 'worker_id']);
});
