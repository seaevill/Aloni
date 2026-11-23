import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test('add a parcel offline (typed στρ. kept exactly), keep it after reload, archive and undo, no dialog', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);

  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('empty-state').locator('button')).toHaveCount(1); // the one action: add a parcel
  await page.getByTestId('empty-state').locator('button').click();
  await page.getByTestId('parcel-save').click(); // nothing typed
  await expect(page.getByRole('alert')).toHaveCount(2);
  const [name, area] = [page.locator('input.input').nth(0), page.locator('input.input').nth(1)];
  await name.fill('Κάτω Κάμπος');
  await area.fill('1.000'); // ambiguous: refused, never guessed
  await page.getByTestId('parcel-save').click();
  await expect(page.getByRole('alert')).toContainText('Μη έγκυρο εμβαδόν');
  await area.fill('0,625');
  await page.getByRole('button', { name: 'Παραλιακό' }).click();
  await page.getByTestId('parcel-save').click();

  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε'); // saved, with a 5 s «Αναίρεση»
  const card = page.locator('main .card');
  await expect(card).toContainText('Κάτω Κάμπος');
  await expect(card).toContainText('0,625 στρ.'); // not 0,63
  await expect(card).not.toContainText('μη συγχρονισμένο'); // nothing is sent yet: no frightening «unsynced» word on the card
  await expect(page.getByTestId('sync-chip')).toHaveText('Εκτός σύνδεσης · Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.');

  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(card).toContainText('0,625 στρ.');

  await card.getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(card).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(card).toContainText('Κάτω Κάμπος');
  expect(dialogs).toEqual([]);
});

test('while the demo farm is active no parcel can be added to it', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('demo-load').click(); // load the demo
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('parcel-demo-note')).toBeVisible();
  await expect(page.getByTestId('parcel-add')).toHaveCount(0);
  await expect(page.locator('main .card')).toHaveCount(5);
});
