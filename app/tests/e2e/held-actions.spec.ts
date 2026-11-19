import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

// «Saved» means saved (T4): the worker's action is kept at the tap and written at the next start even if the app is closed inside the 10 seconds; «Αναίρεση» leaves nothing.
const demoWorker = async (page: Page) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
};
const count = (page: Page, store: string, status?: string) => page.evaluate(([s, st]) => new Promise<number>((res) => {
  const r = indexedDB.open('aloni');
  r.onsuccess = () => { const q = r.result.transaction(s!).objectStore(s!).getAll(); q.onsuccess = () => res((q.result as Array<{ status?: string; deleted_at?: unknown }>).filter((x) => (st === undefined || x.status === st) && !x.deleted_at).length); };
}), [store, status] as const);

test('a skip: reload after 2 seconds and the skip is recorded (the job is not back); undo inside 10 s leaves nothing', async ({ page }) => {
  await demoWorker(page);
  const skipped = () => count(page, 'jobs', 'skipped');
  const before = await skipped();
  await page.getByTestId('job-skip').first().click();
  await page.getByTestId('skip-rain').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.reload();                                                           // the app is closed inside the 10 seconds
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect.poll(skipped).toBe(before + 1);
  // undo: nothing is written
  const jobs = page.getByTestId('worker-job');
  const n = await jobs.count();
  if (n > 0) {
    await page.getByTestId('job-skip').first().click(); await page.getByTestId('skip-rain').click();
    await page.getByTestId('toast').getByRole('button').click();
    await page.waitForTimeout(500);
    expect(await skipped()).toBe(before + 1);
    await expect(jobs).toHaveCount(n);
  }
});

test('an observation: reload after 2 seconds and it is one row; the toast does not cover the next job\'s buttons', async ({ page }) => {
  await demoWorker(page);
  await page.getByTestId('worker-tab-observe').click();
  await page.locator('.seg.two.big').nth(1).locator('button').first().click();    // a parcel (the first group is the worker switch)
  await page.getByTestId('kind-pest').click();
  const rows = () => count(page, 'observations');
  const before = await rows();
  await page.getByTestId('observe-save').click();
  const toast = await page.getByTestId('toast').boundingBox();
  expect(toast!.y).toBeLessThan(120);                                              // at the top, clear of the buttons below
  await page.waitForTimeout(2000);
  await page.reload();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect.poll(rows).toBe(before + 1);
});
