import { expect, test } from '@playwright/test';
import { APP_NAME } from '../../src/config';

test('shell: five tabs in Greek, 375 px, no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  const tabs = page.locator('nav.tabs button');
  await expect(tabs).toHaveCount(5);
  await expect(tabs).toHaveText(['☀️Σήμερα', '🥬Προϊόντα', '🗺️Χωράφια', '📦Αποθήκη', '⋯Περισσότερα']);
  const vw = page.viewportSize()!.width;
  expect(vw).toBe(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  for (const b of await tabs.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(56);
});

test('tabs switch screens', async ({ page }) => {
  await page.goto('/');
  for (const [id, title] of [['crops', 'Προϊόντα'], ['parcels', 'Χωράφια'], ['stock', 'Αποθήκη'], ['more', 'Περισσότερα'], ['today', 'Σήμερα']]) {
    await page.locator(`nav.tabs [data-tab="${id}"]`).click();
    await expect(page.locator('h1')).toContainText(title);
  }
});

test('manifest is valid and installable', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(href!)).json();
  expect(m.display).toBe('standalone');
  expect(m.name).toBe(APP_NAME);
  expect(m.short_name).toBe(APP_NAME);
  expect(await page.title()).toBe(APP_NAME);
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

test('demo farm: load, see data, switch language, remove', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('today-empty')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'Φόρτωση δοκιμαστικού αγροκτήματος' }).click();
  await expect(page.getByRole('status')).toContainText('φορτώθηκε');
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('today-counts')).toContainText('Χωράφια: 5 · Προϊόντα: 10 · Φυτεύσεις: 16');
  await expect(page.locator('h1 .badge')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('.card')).toHaveCount(5);
  // Turkish
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'TR', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Diğer');
  await page.getByRole('button', { name: 'Demo çiftliği sil' }).click();
  await page.getByRole('button', { name: 'EL', exact: true }).click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('today-empty')).toBeVisible();
});

test('service worker registers (offline shell)', async ({ page }) => {
  await page.goto('/');
  const ok = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return !!r.active;
  });
  expect(ok).toBe(true);
});
