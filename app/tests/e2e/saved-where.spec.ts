import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

// Queue item 6 (offline write path): with the network OFF a farm record is still written, and the confirmation says WHERE it is («on the phone»), never only «recorded» as if it had been sent.
const ON_PHONE = 'Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.';

test('offline: harvest and observation are saved and each confirmation says «saved on the phone»', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);   // as in spray.spec: the app is installed before the network goes
  await setup(page, true);
  await context.setOffline(true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await expect(page.getByTestId('harvest-saved-where')).toHaveText(ON_PHONE);
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-saved')).toBeVisible();
  await expect(page.getByTestId('observe-saved-where')).toHaveText(ON_PHONE);
  expect(errors).toEqual([]);
});

test('the Demo farm is never sent anywhere: its confirmation has no «will be sent» line', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();     // «load the demo» from the welcome screen
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-saved')).toBeVisible();
  await expect(page.getByTestId('observe-saved-where')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Queue item 6b: the undo toast after a new record (here a parcel) and the Photos «saved» message say where the record is, too. The toast text itself is unchanged.
test('offline: the parcel undo toast and the photo message say «saved on the phone»', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('0,625');
  await page.getByRole('button', { name: 'Παραλιακό' }).click();
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε');
  await expect(page.getByTestId('toast-saved-where')).toHaveText(ON_PHONE);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d')!; g.fillStyle = '#3a7'; g.fillRect(0, 0, 40, 30); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByTestId('photo-msg')).toHaveText('Η φωτογραφία αποθηκεύτηκε.');
  await expect(page.getByTestId('photo-saved-where')).toHaveText(ON_PHONE);
  expect(errors).toEqual([]);
});
