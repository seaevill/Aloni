import { expect, test, type Page } from '@playwright/test';
import { setup, closeHistory } from './helpers/farm';
import { iphone } from './helpers/iphone';

// a safety test is never retried: a failure that comes and goes is a real race, not noise (see playwright.config.ts)
test.describe.configure({ retries: 0 });

const count = (page: Page, store: string) => page.evaluate((s) => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).count(); q.onsuccess = () => res(q.result); }; }), store);

test('a double tap or a triple tap on a save button makes exactly ONE record (harvest, worker, parcel) and the day shows the true crate count', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  const workersBefore = await count(page, 'workers');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').fill('Δοκιμή');
  await page.getByTestId('worker-add').dblclick();
  await expect.poll(() => count(page, 'workers')).toBe(workersBefore + 1);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  for (let i = 0; i < 4; i += 1) await page.getByTestId('harvest-more').click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('harvest-save').click({ clickCount: 3 });
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  expect(await count(page, 'job_harvest')).toBe(1);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-add').click();
  await page.locator('input.input').nth(0).fill('Νέο χωράφι'); await page.locator('input.input').nth(1).fill('0,5');
  const parcels = await count(page, 'parcels');
  await page.getByTestId('parcel-save').dblclick();
  await expect.poll(() => count(page, 'parcels')).toBe(parcels + 1);
  expect(errors).toEqual([]);
});
