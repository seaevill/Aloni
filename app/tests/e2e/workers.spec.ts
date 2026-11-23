import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('worker roster offline: a name only, kept after reload, archive and undo, no dialog; not in the demo', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await expect(page.getByTestId('workers-empty')).toBeVisible();
  await page.getByTestId('worker-add').click();
  await expect(page.locator('main .msg.error')).toHaveCount(1);
  await page.getByTestId('worker-name').fill('Γιώργος');
  await page.getByTestId('worker-add').click();
  await expect(page.getByTestId('worker')).toHaveText(/Γιώργος/);
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await expect(page.getByTestId('worker')).toHaveCount(1);
  await page.getByTestId('worker').getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(page.getByTestId('worker')).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(page.getByTestId('worker')).toHaveCount(1);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});
