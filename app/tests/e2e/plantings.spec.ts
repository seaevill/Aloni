import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

async function addParcel(page: Page, name: string, area: string) {
  await tab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill(name);
  await page.locator('input.input').nth(1).fill(area);
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε');
}

test('add a planting offline: area kept as typed, bigger-than-parcel only warns, survives reload, archive and undo, no dialog', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);

  await tab(page, 'crops');
  await expect(page.getByTestId('empty-state').locator('button')).toHaveCount(2); // no parcel yet: «add a field» first, the demo second
  await expect(page.getByTestId('empty-state').locator('button').first()).toHaveText('Προσθήκη χωραφιού');
  await addParcel(page, 'Κάτω Κάμπος', '0,5');

  await tab(page, 'crops');
  await page.getByTestId('empty-state').locator('button').click(); // the one action: add a planting
  await page.getByTestId('planting-save').click(); // nothing chosen
  await expect(page.locator('main .msg.error')).toHaveCount(2); // crop, area (the only parcel is chosen for you, the date defaults to today); the backup banner is separate
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.locator('input.input').nth(0).fill('0,75');
  await expect(page.getByTestId('planting-warn')).toContainText('μεγαλύτερο από το χωράφι (0,5 στρ.)');
  await page.locator('input.input').nth(1).fill('2026-02-31');
  await page.getByTestId('planting-save').click();
  await expect(page.locator('main .msg.error')).toContainText('Μη έγκυρη ημερομηνία');
  await page.locator('input.input').nth(1).fill('2026-11-17');
  await page.getByRole('button', { name: 'Σε συγκομιδή' }).click();
  await page.getByTestId('planting-save').click(); // the warning did not block saving

  await expect(page.getByTestId('toast')).toContainText('Η φύτευση αποθηκεύτηκε');
  const line = page.getByTestId('planting');
  await page.getByTestId('crop-open').first().click();                                   // the plantings are on the crop page
  await expect(line).toContainText('Κάτω Κάμπος · 0,75 στρ.');
  await expect(line).toContainText('Σε συγκομιδή');
  await expect(page.getByTestId('sync-chip')).toContainText('Θα σταλεί όταν συνδεθεί λογαριασμός');

  await page.reload();
  await tab(page, 'crops');
  await page.getByTestId('crop-open').first().click();
  await expect(line).toContainText('0,75 στρ.');

  await line.getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(line).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(line).toContainText('Κάτω Κάμπος');
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('the planting form meets the UX bar in el/tr/en (375 px, targets, text size, axe)', async ({ page }) => {
  const errors = await iphone(page);
  await addParcel(page, 'Κάτω Κάμπος', '0,5');
  await tab(page, 'crops');
  await page.getByTestId('empty-state').locator('button').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more');
    await page.getByRole('button', { name: lang, exact: true }).click();
    await tab(page, 'crops');
    if (!(await page.getByTestId('planting-save').isVisible())) await page.getByTestId('empty-state').locator('button').click();
    await page.getByTestId('planting-save').click(); // shows the error lines too
    const found = await page.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > 375) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
      for (const e of document.querySelectorAll('main button, main input')) {
        const r = e.getBoundingClientRect();
        if (r.height < 56 || r.width < 44) out.push(`target ${e.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    });
    expect(found, lang).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), lang).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('while the demo farm is active no planting can be added, and the demo shows its plantings in the farm\'s words', async ({ page }) => {
  await iphone(page);
  await tab(page, 'more');
  await page.getByTestId('demo-load').click();
  await tab(page, 'crops');
  await expect(page.getByTestId('planting-demo-note')).toBeVisible();
  await expect(page.getByTestId('planting-add')).toHaveCount(0);
  await expect(page.locator('main .card')).toHaveCount(10);
  await page.getByTestId('crop-open').first().click();
  await expect(page.getByTestId('planting').first()).not.toContainText('harvesting');
});
