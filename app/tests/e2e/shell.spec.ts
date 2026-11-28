import { expect, test } from '@playwright/test';
import { goTab, openSettings } from './helpers/tabs';
import { APP_NAME } from '../../src/config';

test('shell: four tabs in Greek (Αποθήκη opens from Άλλα), 375 px, no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  const tabs = page.locator('nav.tabs button');
  await expect(tabs).toHaveCount(4);
  // one short word per tab, drawn with line icons (no emoji), and every label stays on ONE line
  const labels = (await tabs.allInnerTexts()).map((s) => s.replace(/[\u00ad\s]/g, ''));
  expect(labels).toEqual(['Σήμερα', 'Φυτά', 'Χωράφια', 'Άλλα']);
  // every label is ONE line (the crops tab is «Φυτά» since 2026-11-21: «Καλλιέρ-γειες» broke in the 75 px column)
  for (const l of await page.locator('nav.tabs .lbl').all()) { const text = (await l.innerText()).replace(/\u00ad/g, ''); expect((await l.boundingBox())!.height).toBeLessThanOrEqual(20); }
  await expect(page.locator('nav.tabs svg')).toHaveCount(4);
  const vw = page.viewportSize()!.width;
  expect(vw).toBe(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  for (const b of await tabs.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(56);
});

test('tabs switch screens', async ({ page }) => {
  await page.goto('/');
  for (const [id, title] of [['crops', 'Φυτά'], ['parcels', 'Χωράφια'], ['stock', 'Αποθήκη'], ['more', 'Άλλα'], ['today', 'Σήμερα']]) {
    await goTab(page, id);
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
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await openSettings(page);
  await page.getByRole('button', { name: 'Φόρτωση επίδειξης' }).click();
  await expect(page.getByRole('status')).toContainText('φορτώθηκε');
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('kpi-parcels')).toContainText(/Χωράφια\s*5/);
  await expect(page.getByTestId('kpi-crops')).toContainText(/Καλλιέργειες\s*10/);
  await expect(page.getByTestId('today-counts')).toContainText('Φυτεύσεις: 16');
  await expect(page.getByTestId('demo-banner')).toBeVisible(); // the demo is marked in ONE place only
  await expect(page.locator('h1 .badge')).toHaveCount(0);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('.card')).toHaveCount(5);
  // Turkish
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'TR', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Diğer');
  await page.getByTestId('open-settings').click();
  await page.getByRole('button', { name: 'Demo çiftliği sil' }).click();
  await page.locator('button.back').click();
  await page.getByRole('button', { name: 'EL', exact: true }).click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('service worker registers (offline shell)', async ({ page }) => {
  await page.goto('/');
  const ok = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return !!r.active;
  });
  expect(ok).toBe(true);
});

test('Information screen: draft legal texts, offline-safe, marked for lawyer review', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'Πληροφορίες' }).click();
  await expect(page.locator('.draft')).toContainText('προς έλεγχο από δικηγόρο');
  await expect(page.getByTestId('info-privacy')).toContainText('Δεν παρακολουθούμε τη θέση σας');
  await expect(page.getByTestId('info-disclaimer')).toContainText('Δεν αποτελούν συνταγή');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await expect(page.locator('h1')).toHaveText('Άλλα');
});

test('controller details: entered once, kept in the database, shown in the notice, gate opens', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'Πληροφορίες' }).click();
  await expect(page.getByTestId('invite-status')).toContainText('κλειστή');
  await expect(page.getByTestId('info-privacy')).toContainText('[δεν έχει οριστεί]');
  const inputs = page.locator('input.input');
  await inputs.nth(0).fill('Test Person');
  await inputs.nth(1).fill('Test street 1');
  await inputs.nth(2).fill('+30 000 0000000');
  await page.getByRole('button', { name: 'Αποθήκευση' }).click();
  await expect(page.getByTestId('info-privacy')).toContainText('Test Person');
  await expect(page.getByTestId('invite-status')).toContainText('επιτρέπεται');
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByRole('button', { name: 'Πληροφορίες' }).click();
  await expect(page.getByTestId('info-privacy')).toContainText('Test street 1');
  for (const i of [0, 1, 2]) expect((await inputs.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(56);
});
