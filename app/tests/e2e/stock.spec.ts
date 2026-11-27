import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => goTab(page, id);
const inputs = (page: Page) => page.locator('main input.input');

async function addProduct(page: Page) {
  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Kocide 2000');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click();
  await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε');
}

test('stock offline: receive with expiry year, exact balance, adjust needs direction/quantity/reason, negative shown and flagged, expired flagged, survives reload', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await addProduct(page);
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('stock-empty')).toBeVisible();

  await page.getByTestId('receive-open').click();
  await page.getByTestId('receive-save').click(); // nothing chosen: expiry and quantity are asked for
  await expect(page.locator('main .msg.error')).toHaveCount(2);
  await inputs(page).nth(0).fill('A123');
  await page.locator('input[type=date]').fill('2028-03-31');
  await inputs(page).nth(2).fill('4,5');
  await page.getByTestId('receive-save').click();
  const lot = page.getByTestId('lot');
  await expect(lot).toContainText('Παρτίδα A123');
  await expect(lot).toContainText('2028'); // the year is shown
  await expect(lot.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 4,5 kg');
  await expect(page.getByTestId('stock-total')).toHaveText('Σύνολο: 4,5 kg');
  await expect(lot.getByTestId('lot-flag')).toHaveCount(0);
  await expect(lot.getByTestId('movement')).toHaveText('+4,5 · παραλαβή');

  await lot.getByTestId('adjust-open').click();
  await page.getByTestId('adjust-save').click(); // nothing chosen
  await expect(page.locator('main .msg.error')).toHaveCount(3);
  await page.getByRole('button', { name: 'Μείωση' }).click();
  await inputs(page).nth(0).fill('0,25');
  await inputs(page).nth(1).fill('έχυθηκε');
  await page.getByTestId('adjust-save').click();
  await expect(lot.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 4,25 kg'); // exact, not 4,3

  await lot.getByTestId('adjust-open').click(); // take out more than there is
  await page.getByRole('button', { name: 'Μείωση' }).click();
  await inputs(page).nth(0).fill('5');
  await inputs(page).nth(1).fill('καταμέτρηση');
  await page.getByTestId('adjust-save').click();
  await expect(lot.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: −0,75 kg');
  await expect(lot.getByTestId('lot-flag')).toContainText('Αρνητικό υπόλοιπο'); // shown, not hidden
  await expect(lot.getByTestId('movement')).toHaveCount(3); // every movement is still listed

  await page.getByRole('button', { name: 'Επιστροφή' }).click(); // a second lot, already expired
  await page.getByTestId('stock-open').click();
  await page.getByTestId('receive-open').click();
  await page.locator('input[type=date]').fill('2020-01-31');
  await inputs(page).nth(2).fill('1');
  await page.getByTestId('receive-save').click();
  await expect(page.getByTestId('lot')).toHaveCount(2);
  await expect(page.getByTestId('lot').filter({ hasText: 'Χωρίς αριθμό παρτίδας' }).getByTestId('lot-flag')).toHaveText('Έληξε');
  await expect(page.getByTestId('stock-total')).toHaveText('Σύνολο: 0,25 kg'); // −0,75 + 1

  await page.reload();
  await tab(page, 'stock');
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot')).toHaveCount(2);
  await expect(page.getByTestId('stock-total')).toHaveText('Σύνολο: 0,25 kg');
  expect(errors).toEqual([]);
});

test('the stock forms meet the UX bar in el/tr/en (375 px, targets, axe)', async ({ page }) => {
  const errors = await iphone(page);
  await addProduct(page);
  await page.getByTestId('stock-open').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more');
    await page.getByRole('button', { name: lang, exact: true }).click();
    await tab(page, 'stock');
    if (!(await page.getByTestId('receive-save').isVisible())) {
      if (!(await page.getByTestId('receive-open').isVisible())) await page.getByTestId('stock-open').click();
      await page.getByTestId('receive-open').click();
    }
    await page.getByTestId('receive-save').click();
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
