import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const inputs = (page: Page) => page.locator('main input.input');

/** A real farm with everything a spray needs: parcel, planting, product with a COMPLETE label (optionally signed), a lot of 4,5 kg and a worker. */
async function setup(page: Page, signed: boolean) {
  await tab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await inputs(page).nth(0).fill('Κάτω Κάμπος'); await inputs(page).nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await tab(page, 'crops');
  await page.getByTestId('empty-state').locator('button').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click(); await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await inputs(page).nth(0).fill('0,25');
  await page.getByTestId('planting-save').click();
  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await inputs(page).nth(0).fill('Kocide 2000');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click(); await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await page.getByTestId('labeluse-open').click();
  await page.getByTestId('labeluse-add').click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click(); await page.getByRole('button', { name: 'Μία δόση' }).click();
  await page.getByRole('button', { name: 'ml/στρ.', exact: true }).click();
  await inputs(page).nth(0).fill('0,025'); await inputs(page).nth(1).fill('7'); await inputs(page).nth(2).fill('24'); await inputs(page).nth(3).fill('3');
  await page.getByTestId('labeluse-save').click();
  if (signed) {
    await page.getByTestId('signoff-open').click();
    await page.locator('input.input').nth(0).fill('Test Agronomist');
    await page.getByTestId('signoff-save').click();
  }
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.getByTestId('stock-open').click();
  await page.getByTestId('receive-open').click();
  await page.locator('input[type=date]').fill('2028-03-31'); await inputs(page).nth(2).fill('4,5');
  await page.getByTestId('receive-save').click();
  await tab(page, 'more');
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').fill('Γιώργος');
  await page.getByTestId('worker-add').click();
  await tab(page, 'today');
}

async function spray(page: Page) {
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await expect(page.getByTestId('spray-dose')).toHaveValue('0,025'); // the label's own single dose is offered as a start
  await page.locator('.seg button[aria-pressed="true"]', { hasText: 'ml/στρ.' }).waitFor();
  await page.locator('h2:has-text("Παρτίδα") + .seg button').first().click(); // the only lot
  await page.getByTestId('spray-qty').fill('0,25');
}

test('a spray with a SIGNED label: recorded with «Ψέκασε», the exact waiting periods and the stock movement', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await setup(page, true);
  await context.setOffline(true);
  await page.getByTestId('spray-open').click();
  await page.getByTestId('spray-save').click(); // nothing chosen
  await expect(page.getByTestId('spray-error')).toBeVisible();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await expect(page.getByTestId('spray-label')).toContainText('Υπογραφή γεωπόνου: Test Agronomist');
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.locator('h2:has-text("Παρτίδα") + .seg button').first().click();
  await page.getByTestId('spray-qty').fill('0,25');
  await expect(page.getByTestId('spray-flags')).toHaveCount(0); // signed, in range, in date, stock enough
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toHaveText('Ο ψεκασμός καταγράφηκε.');
  const card = page.getByTestId('spray');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Ψέκασε: Γιώργος');
  await expect(card.getByTestId('spray-phi')).toContainText('Αναμονή λήγει');
  await expect(card.getByTestId('spray-rei')).toContainText('Επανείσοδος από');
  await expect(card.getByTestId('spray-phi-unknown')).toHaveCount(0);
  await tab(page, 'stock');
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 4,25 kg'); // 4,5 − 0,25, exact
  await expect(page.getByTestId('movement').last()).toHaveText('−0,25 · ψεκασμός');
  await page.reload();
  await expect(page.getByTestId('spray')).toHaveCount(1);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('a spray with an UNSIGNED label is still recorded, marked, and its waiting period is unknown (red)', async ({ page }) => {
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await expect(page.getByTestId('spray-flags')).toContainText('Χωρίς υπογραφή γεωπόνου');
  await page.getByTestId('spray-save').click();
  const card = page.getByTestId('spray');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Χωρίς υπογραφή γεωπόνου');
  await expect(card.getByTestId('spray-phi-unknown')).toContainText('Άγνωστη αναμονή');
  await expect(card.getByTestId('spray-phi')).toHaveCount(0);
});

test('the spray form meets the UX bar in el/tr/en (375 px, targets, axe)', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const errors = await iphone(page);
  await setup(page, true);
  await page.getByTestId('spray-open').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more'); await page.getByRole('button', { name: lang, exact: true }).click(); await tab(page, 'today');
    if (!(await page.getByTestId('spray-save').isVisible())) await page.getByTestId('spray-open').click();
    await page.getByRole('button', { name: /Σπανάκι|Ispanak|Spinach/ }).first().click();
    await page.getByTestId('spray-save').click();
    const found = await page.evaluate(() => [
      ...(document.documentElement.scrollWidth > 375 ? ['scrollWidth'] : []),
      ...[...document.querySelectorAll('main button:not(:disabled), main input:not(:disabled):not([hidden])')].filter((e) => e.getBoundingClientRect().height < 56 || e.getBoundingClientRect().width < 44).map((e) => `target ${e.tagName}`),
    ]);
    expect(found, lang).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), lang).toEqual([]);
  }
  expect(errors).toEqual([]);
});
