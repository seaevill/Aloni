import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('a worker writes a note for tomorrow; the owner sees it in Εργασίες tagged «από εργάτη» and adds his own', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('note-error')).toBeVisible();
  await page.getByTestId('note-text').fill('Να φέρουμε κλούβες');
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('note')).toHaveCount(1);
  await page.getByTestId('worker-exit').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('tasks-counts').click();
  const sheet = page.getByTestId('sheet-jobs');
  await expect(sheet.getByTestId('note')).toContainText('Να φέρουμε κλούβες');
  await expect(sheet.getByTestId('note-by-worker')).toBeVisible();
  await sheet.getByTestId('note-text').fill('Ποτίστε το σπανάκι');
  await sheet.getByTestId('note-add').click();
  await expect(sheet.getByTestId('note')).toHaveCount(2);
  await expect(sheet.getByTestId('note-by-worker')).toHaveCount(1);
});
