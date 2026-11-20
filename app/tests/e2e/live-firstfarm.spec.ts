import { expect, test, type Page } from '@playwright/test';

// «Δημιουργία κτήματος» against the MOCK backend (the e2e build): a signed-in person with NO farm sets up the first one through the app (migration 0034). Nothing leaves the machine.
const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const GRANT = { access_token: 'a-new', refresh_token: 'r-new', expires_in: 3600, user: { id: 'u-new', email: 'bora@example.org' } };

async function mock(page: Page, farms: Array<{ farm_id: string }>, createAnswer?: { status: number; body: string }) {
  const seen = { created: [] as Array<Record<string, unknown>> };
  await page.route('**/mock/auth/v1/otp', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/mock/auth/v1/verify', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GRANT) }));
  await page.route('**/mock/rest/v1/rpc/accept_invitation', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"P0002","message":"there is no open invitation for this account"}' }));
  await page.route('**/mock/rest/v1/farm_members*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(farms) }));
  await page.route('**/mock/rest/v1/rpc/create_first_farm', async (r) => {
    seen.created.push(JSON.parse(r.request().postData() ?? '{}'));
    await r.fulfill({ status: createAnswer?.status ?? 200, contentType: 'application/json', body: createAnswer?.body ?? '"ok"' });
  });
  await page.route('**/mock/rest/v1/rpc/apply_ops', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  return seen;
}

async function signIn(page: Page) {
  await tab(page, 'more');
  await page.getByTestId('signin-send').scrollIntoViewIfNeeded();
  await page.getByTestId('sign-in').locator('input').first().fill('bora@example.org');
  await page.getByTestId('signin-send').click();
  await page.getByTestId('sign-in').locator('input').nth(1).fill('123456');
  await page.getByTestId('signin-verify').click();
  await expect(page.getByTestId('signed-in')).toContainText('bora@example.org');
}

test('a signed-in person with no farm sees the wizard; a name is required; the farm is created with THIS phone\'s farm code, and sync is not switched on', async ({ page }) => {
  const seen = await mock(page, []);
  await page.goto('/');
  await signIn(page);
  await expect(page.getByTestId('create-farm')).toBeVisible();
  await page.getByTestId('create-farm-go').click();
  await expect(page.getByTestId('create-farm-error')).toContainText('Γράψτε ένα όνομα κτήματος');       // empty name: nothing is sent
  expect(seen.created).toHaveLength(0);
  const code = (await page.getByTestId('farm-id').innerText()).replace(/^.*?:\s*/, '').trim();
  await page.getByTestId('create-farm-name').fill('Το κτήμα του Μπόρα');
  await page.getByTestId('create-farm-go').click();
  await expect(page.getByTestId('farm-created')).toContainText('Ο συγχρονισμός δεν έχει ανοίξει ακόμη');
  expect(seen.created).toEqual([{ p_farm: code, p_name: 'Το κτήμα του Μπόρα' }]);
  await expect(page.getByTestId('create-farm')).toHaveCount(0);
});

test('the server\'s «one farm per person» is told in plain words, nothing is claimed as created', async ({ page }) => {
  await mock(page, [], { status: 400, body: '{"code":"23514","message":"one farm per person: you have set up a farm before"}' });
  await page.goto('/');
  await signIn(page);
  await page.getByTestId('create-farm-name').fill('Δεύτερο');
  await page.getByTestId('create-farm-go').click();
  await expect(page.getByTestId('create-farm-error')).toContainText('Έχετε ήδη δημιουργήσει κτήμα');
  await expect(page.getByTestId('farm-created')).toHaveCount(0);
});

test('a person who already belongs to a farm (an invited worker, a returning owner) never sees the wizard', async ({ page }) => {
  await mock(page, [{ farm_id: 'f-existing' }]);
  const asked = page.waitForResponse('**/mock/rest/v1/farm_members*');                       // the app asked the server, got «a farm», and showed nothing
  await page.goto('/');
  await signIn(page);
  await asked;
  await page.waitForTimeout(300);
  await expect(page.getByTestId('create-farm')).toHaveCount(0);
});
