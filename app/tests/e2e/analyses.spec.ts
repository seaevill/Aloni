import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => goTab(page, id);
const inputs = (page: Page) => page.locator('main input.input');
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function addParcel(page: Page) {
  await tab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await inputs(page).nth(0).fill('Κάτω Κάμπος');
  await inputs(page).nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε');
}

test('analyses offline: date required, pH 0–14, EC needs its unit, values kept as typed, report photo, reload, archive and undo', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await addParcel(page);
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  await expect(page.getByTestId('analysis-empty')).toBeVisible();

  await page.getByTestId('analysis-add-soil').click();
  await page.getByTestId('analysis-save').click(); // no date
  await expect(page.locator('main .msg.error')).toHaveCount(1);
  await page.locator('input[type=date]').fill('2026-11-10');
  await inputs(page).nth(1).fill('Αγρολαμπ'); // lab
  await inputs(page).nth(2).fill('15'); // pH above the scale
  await inputs(page).nth(3).fill('1,2'); // EC without its unit
  await page.getByTestId('analysis-save').click();
  await expect(page.locator('main .msg.error')).toHaveCount(2);
  await inputs(page).nth(2).fill('7,4');
  await page.getByRole('button', { name: 'dS/m' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'report.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.locator('main .photo')).toHaveCount(1);
  await page.getByTestId('analysis-save').click();

  const card = page.getByTestId('analysis');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Έδαφος: Τρίτη 10 Νοεμβρίου 2026');
  await expect(card).toContainText('pH: 7,4');
  await expect(card).toContainText('EC: 1,2 dS/m');
  await expect(card).toContainText('Εργαστήριο: Αγρολαμπ');
  await expect(card.locator('.photo')).toHaveCount(1);

  await page.getByTestId('analysis-add-water').click(); // water, with nothing but the date: pH and EC stay «not recorded»
  await page.locator('input[type=date]').fill('2026-11-12');
  await page.getByTestId('analysis-save').click();
  await expect(card).toHaveCount(2);
  await expect(card.first()).toContainText('Νερό'); // newest first
  await expect(card.first()).not.toContainText('pH');

  await page.reload();
  await tab(page, 'parcels');
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  await expect(card).toHaveCount(2);
  await expect(card.nth(1).locator('.photo')).toHaveCount(1);
  await card.first().getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(card).toHaveCount(1);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(card).toHaveCount(2);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('the analysis form meets the UX bar in el/tr/en (375 px, targets, axe)', async ({ page }) => {
  const errors = await iphone(page);
  await addParcel(page);
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more');
    await page.getByRole('button', { name: lang, exact: true }).click();
    await tab(page, 'parcels');
    if (!(await page.getByTestId('analysis-save').isVisible())) {
      if (!(await page.getByTestId('analysis-add-soil').isVisible())) { if (!(await page.getByTestId('analysis-open').isVisible())) await page.getByTestId('parcel-open').first().click(); await page.getByTestId('analysis-open').click(); }
      await page.getByTestId('analysis-add-soil').click();
    }
    await page.getByTestId('analysis-save').click();
    const found = await page.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > 375) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
      for (const e of document.querySelectorAll('main button:not(:disabled), main input:not(:disabled):not([hidden])')) {
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
