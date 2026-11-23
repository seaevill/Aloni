import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, spray, openHistory, closeHistory } from './helpers/farm';
import { athensInput, installClock } from './helpers/clock';

// Three complete workflows, end to end, with the proof kept as screenshots (docs/design/screenshots-2026-11-23/workflow-*.png) – 2026-11-23 recovery sprint.
const SHOTS = '../docs/design/screenshots-2026-11-23';
const rows = (page: Page, store: string) => page.evaluate((s) => new Promise<Record<string, unknown>[]>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).getAll(); q.onsuccess = () => res(q.result as Record<string, unknown>[]); }; }), store);

test('A · task: create → assign → listed on Σήμερα → kept after a reload → the worker does it → it is a record', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.getByTestId('job-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByTestId('job-dose-same').click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-planned')).toContainText('Σπανάκι · Κάτω Κάμπος · Γιώργος');
  await page.screenshot({ path: `${SHOTS}/workflow-a1-task-on-today.png` });
  await page.reload();
  await expect(page.getByTestId('job-planned')).toHaveCount(1);                      // persisted
  const planned = await rows(page, 'jobs');
  expect(planned).toHaveLength(1);
  expect(planned[0]).toMatchObject({ status: 'planned' });
  expect(errors).toEqual([]);
});

test('A · task: the worker marks a planned job done (Demo worker view): the open list shrinks, the record is saved', async ({ page }) => {
  await installClock(page);
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction(['job_spray'], 'readwrite'); tx.objectStore('job_spray').clear(); tx.oncomplete = () => done(); }; }));
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  const jobs = page.getByTestId('worker-job');
  await expect(jobs).toHaveCount(2);
  await page.screenshot({ path: `${SHOTS}/workflow-a2-worker-before.png` });
  await jobs.first().getByTestId('job-done').click();
  await page.getByTestId('worker-start').fill(await athensInput(page, -3_600_000));
  await page.getByTestId('job-confirm').click();
  await page.clock.fastForward(10500);
  await expect(page.getByTestId('worker-finished')).toHaveCount(1);
  await expect(jobs).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/workflow-a2-worker-after.png` });
  expect((await rows(page, 'job_spray')).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('B · stock: an isolated 100 kg lot − 26 kg used by a spray = 74 kg, both movements listed, in kg (not crates)', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true, '100');
  await spray(page);
  await page.getByTestId('spray-qty').fill('26');
  await page.getByTestId('spray-save').click();
  await closeHistory(page);
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('stock-open').click();
  const lot = page.getByTestId('lot');
  await expect(lot.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 74 kg');
  await expect(page.getByTestId('stock-total')).toHaveText('Σύνολο: 74 kg');
  await expect(lot.getByTestId('movement')).toHaveCount(2);
  await expect(lot.getByTestId('movement').first()).toContainText('100');
  await expect(lot.getByTestId('movement').nth(1)).toContainText('26');
  await expect(lot).not.toContainText('κλούβ');                                     // chemical stock is never crates
  await page.screenshot({ path: `${SHOTS}/workflow-b-stock-74.png` });
  await page.reload();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 74 kg');       // persisted
  expect(errors).toEqual([]);
});

test('C · harvest: a valid record is saved, shows in Ιστορικό with its field and persists after a reload', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  for (let i = 0; i < 4; i += 1) await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await openHistory(page);
  await expect(page.getByTestId('harvest')).toContainText('4 κλούβες');
  await expect(page.getByTestId('harvest')).toContainText('Κάτω Κάμπος');           // the parcel
  await page.screenshot({ path: `${SHOTS}/workflow-c-harvest-history.png` });
  const saved = await rows(page, 'job_harvest');
  expect(saved).toHaveLength(1);
  await page.reload();
  expect(await rows(page, 'job_harvest')).toHaveLength(1);                              // persisted
  await openHistory(page);
  await expect(page.getByTestId('harvest')).toContainText('4 κλούβες');
  expect(errors).toEqual([]);
});
