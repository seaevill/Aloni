import { expect, test } from './helpers/test';

test('the Demo register promotes record identity and retains draft and export controls at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-register').click();
  const first = page.getByTestId('register-line').first();
  await expect(first.getByTestId('register-record-product')).toBeVisible();
  await expect(first.getByTestId('register-record-end')).toBeVisible();
  await expect(page.getByTestId('register-draft')).toBeVisible();
  for (const id of ['register-csv', 'register-csv-machine', 'register-csv-warnings', 'register-print']) {
    expect((await page.getByTestId(id).boundingBox())?.height).toBeGreaterThanOrEqual(56);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('the print button opens the browser print action and exposes a Greek draft without signatures', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    window.print = () => { document.documentElement.dataset.printRequested = 'yes'; };
  });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-register').click();
  await page.getByTestId('register-print').click();
  await expect(page.locator('html')).toHaveAttribute('data-print-requested', 'yes');
  await page.emulateMedia({ media: 'print' });
  const draft = page.getByTestId('register-print-page');
  await expect(draft).toBeVisible();
  await expect(draft).toHaveAttribute('lang', 'el');
  await expect(draft).toContainText('ΠΡΟΣΧΕΔΙΟ');
  await expect(draft.getByTestId('register-print-dose').first()).toBeVisible();
  const stored = await page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const open = indexedDB.open('aloni');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const request = open.result.transaction('job_spray').objectStore('job_spray').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result.map((row: { dose_str: string }) => row.dose_str));
        open.result.close();
      };
    };
  }));
  expect((await draft.getByTestId('register-print-dose').allTextContents()).sort()).toEqual(stored.sort());
  await expect(page.locator('.register .sign')).toBeHidden();
  const evidence = process.env.N23_REGISTER_EVIDENCE;
  if (evidence) await page.screenshot({ path: evidence, animations: 'disabled' });
});
