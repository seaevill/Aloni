import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

// (second file; the harvest/worker/parcel double-tap safety test stays in double-submit.spec.ts) A double tap on «save» must write ONE record (T3 2026-11-19: a double tap saved a harvest twice). The spray, harvest, job, stock, parcel, planting, product and label forms already used the shared guard;
// these are the record-creating forms that did not.
const count = (page: import('@playwright/test').Page, store: string) => page.evaluate((s) => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).count(); q.onsuccess = () => res(q.result); }; }), store);

test('owner observation: a double tap on «Αποθήκευση» records one observation', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, false);
  await closeHistory(page);
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').dblclick();
  await expect(page.getByTestId('observe-saved')).toBeVisible();
  expect(await count(page, 'observations')).toBe(1);
  expect(errors).toEqual([]);
});

test('field work: a double tap on «Αποθήκευση» records one irrigation', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, false);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('fieldwork');
  await card.getByTestId('work-add-irrigate').click();
  await card.getByTestId('work-m3').fill('3,5');
  await card.getByTestId('work-save').dblclick();
  await expect(card.getByTestId('work-item')).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(card.getByTestId('work-item')).toHaveCount(1);
  expect(errors).toEqual([]);
});
