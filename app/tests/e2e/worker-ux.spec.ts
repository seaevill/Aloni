import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// The worker's screens: a closed button still answers, every panel has a way back, the undo button is big, the view survives a reload.
async function demoWorker(page: import('@playwright/test').Page) {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction(['job_spray'], 'readwrite'); tx.objectStore('job_spray').clear(); tx.oncomplete = () => done(); }; }));
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
}

test('the panels have a «Πίσω», the undo button is 72 px and the worker view survives a reload', async ({ page }) => {
  await demoWorker(page);
  await page.getByTestId('job-done').first().click();
  await expect(page.getByTestId('job-confirm')).toBeVisible();
  await page.getByTestId('job-back').click();
  await expect(page.getByTestId('job-confirm')).toHaveCount(0);
  await expect(page.getByTestId('job-done').first()).toBeVisible();
  await page.getByTestId('job-skip').first().click();
  await expect(page.getByTestId('skip-rain')).toBeVisible();
  await page.getByTestId('job-back').click();
  await expect(page.getByTestId('skip-rain')).toHaveCount(0);
  await page.getByTestId('job-done').first().click();
  await page.getByTestId('worker-start').fill(new Date(Date.now() - 3_600_000).toISOString().slice(0, 16));
  await page.getByTestId('job-confirm').click();
  const undo = page.getByTestId('toast').getByRole('button');
  expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(72);
  await page.reload();
  await expect(page.getByTestId('worker-app')).toBeVisible();   // still the worker's screens after a reload
  await page.getByTestId('worker-exit').click();
  await page.reload();
  await expect(page.getByTestId('worker-app')).toHaveCount(0);  // leaving the worker view is remembered too
});

test('a locked «Έγινε» looks closed and says WHY when it is pressed', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  const done = page.getByTestId('job-done').first();
  await expect(done).toBeVisible();
  // the demo's older sprays have unknown waiting periods: the button is closed
  await expect(done).toBeDisabled();
  await done.evaluate((e) => e.scrollIntoView({ block: 'center' }));        // clear of the bottom tray
  await done.click({ force: true });
  await expect(page.getByTestId('worker-lock-why').first()).toBeVisible();
  const bg = await done.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgb(19, 74, 43)');                       // not the forest-green «open» fill
});
