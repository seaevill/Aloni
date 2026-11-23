import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('add a product offline with a label photo: name kept, type and unit must be chosen, survives reload, archive and undo, no dialog', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);

  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await page.getByTestId('product-save').click(); // nothing chosen
  await expect(page.locator('main .msg.error')).toHaveCount(3);
  await page.locator('input.input').nth(0).fill('Kocide 2000');
  await page.locator('input.input').nth(1).fill('1234/56');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click();
  await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'label.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.locator('main .photo')).toHaveCount(1);
  await page.getByTestId('product-save').click();

  await expect(page.getByTestId('toast')).toContainText('Το προϊόν αποθηκεύτηκε');
  const card = page.getByTestId('product');
  await expect(card).toContainText('Kocide 2000');
  await expect(card.locator('.tag').nth(0)).toHaveText('Μυκητοκτόνο'); await expect(card.locator('.tag').nth(1)).toHaveText('1234/56');
  await expect(card.locator('.photo')).toHaveCount(1);
  await expect(card).not.toContainText('μη συγχρονισμένο');
  await expect(card.getByTestId('product-stock')).toHaveText('Υπόλοιπο: 0 kg'); // the real product shows its stock

  await page.reload();
  await tab(page, 'stock');
  await expect(card).toContainText('Kocide 2000');
  await expect(card.locator('.photo')).toHaveCount(1); // the label photo is still there
  await card.getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(card).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(card).toContainText('Kocide 2000');
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('while the demo farm is active no product can be added', async ({ page }) => {
  await iphone(page);
  await tab(page, 'more');
  await page.locator('main button.btn').first().click();
  await expect(page.getByTestId('demo-banner')).toBeVisible();      // wait until the demo is loaded: its banner pushes the page down, a tap sent before it lands on the wrong spot
  await tab(page, 'stock');
  await expect(page.getByTestId('product-demo-note')).toBeVisible();
  await expect(page.getByTestId('product-add')).toHaveCount(0);
});
