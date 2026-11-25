import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

// SQL 0036 is applied: once the owner confirms it (readiness «migration» ≥ 0037) the harvest row carries destination 'store' / 'direct' so it syncs; the receiver's name and phone NEVER go on the row. Before the confirmation nothing changes (the answer stays on this phone).
const confirm = (page: Page) => page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0037' } }); tx.oncomplete = () => ok(); }; }));
const harvests = (page: Page) => page.evaluate(() => new Promise<Array<Record<string, unknown>>>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_harvest').objectStore('job_harvest').getAll(); q.onsuccess = () => res(q.result as Array<Record<string, unknown>>); }; }));
const outboxFor = (page: Page) => page.evaluate(() => new Promise<Array<{ table: string; row: Record<string, unknown> }>>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('outbox').objectStore('outbox').getAll(); q.onsuccess = () => res(q.result as never); }; }));

async function harvestWith(page: Page, dest: 'harvest-dest-store' | 'harvest-dest-dispatch') {
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId(dest).click();
  if (dest === 'harvest-dest-dispatch') { await page.getByTestId('harvest-recv-name').fill('Δημήτρης'); await page.getByTestId('harvest-recv-phone').fill('6922222222'); }
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
}

test('after the owner confirmed 0036/0037: a direct dispatch is written as destination = direct, a store harvest as store; the receiver stays off the row and off the outbox', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await confirm(page);
  await page.reload();
  await harvestWith(page, 'harvest-dest-dispatch');
  await harvestWith(page, 'harvest-dest-store');
  const rows = await harvests(page);
  expect(rows.map((r) => r.destination).sort()).toEqual(['direct', 'store']);
  const wire = JSON.stringify((await outboxFor(page)).filter((o) => o.table === 'job_harvest'));
  expect(wire).toContain('"destination":"direct"');
  expect(wire).not.toContain('Δημήτρης');
  expect(wire).not.toContain('6922222222');
  expect(JSON.stringify(rows)).not.toContain('6922222222');
});

test('before the confirmation nothing changes: the answer stays on the phone, the row has no destination', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await harvestWith(page, 'harvest-dest-dispatch');
  const rows = await harvests(page);
  expect(rows).toHaveLength(1);
  expect('destination' in rows[0]!).toBe(false);
});
