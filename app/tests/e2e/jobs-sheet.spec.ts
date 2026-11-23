import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// «Εργασίες» counts open the jobs sheet: which jobs, for whom, when; nothing in it changes a job.
test.use({ viewport: { width: 375, height: 812 } });

test('the counts line opens the jobs sheet; a job planned for a worker shows product, crop · field, worker and day', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('tasks-counts').click();
  const sheet = page.getByTestId('sheet-jobs');
  await expect(sheet.getByTestId('sheet-why')).toContainText('Δεν υπάρχουν εργασίες');       // nothing planned yet: the reason, not a blank
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('job-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByTestId('job-dose-same').click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-saved')).toBeVisible();
  await page.getByTestId('tasks-counts').click();
  const row = sheet.getByTestId('sheet-jobs-today').locator('.ds-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Kocide 2000');
  await expect(row).toContainText('Σπανάκι · Κάτω Κάμπος');
  await expect(row).toContainText('Γιώργος');
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/jobs/all');
  expect((await page.getByTestId('tasks-counts').boundingBox()) !== null).toBe(true);
});
