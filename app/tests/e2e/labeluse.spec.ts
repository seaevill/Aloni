import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

async function addProduct(page: Page) {
  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Kocide 2000');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click();
  await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await expect(page.getByTestId('toast')).toContainText('αποθηκεύτηκε');
}
const inputs = (page: Page) => page.locator('main input.input');

test('label details offline: values kept as typed, empty or «δεν αναγράφεται» = blocked, «Μη εγκεκριμένο» until approved, errors never guessed, edit, reload', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await addProduct(page);
  await page.getByTestId('labeluse-open').click();
  await expect(page.getByTestId('labeluse-empty')).toBeVisible();

  // 1) a complete label: single dose, unit, dose 0,025, PHI 7, REI 24, 3 applications
  await page.getByTestId('labeluse-add').click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.getByRole('button', { name: 'Μία δόση' }).click();
  await page.getByRole('button', { name: 'ml/στρ.', exact: true }).click();
  await inputs(page).nth(0).fill('1.000'); // ambiguous: refused
  await inputs(page).nth(1).fill('7,5'); // not a whole number: refused
  await page.getByTestId('labeluse-save').click();
  await expect(page.locator('main .msg.error')).toHaveCount(2);
  await inputs(page).nth(0).fill('0,025');
  await inputs(page).nth(1).fill('7');
  await inputs(page).nth(2).fill('24');
  await inputs(page).nth(3).fill('3');
  await page.getByTestId('labeluse-save').click();
  const cards = page.getByTestId('labeluse');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Σπανάκι');
  await expect(cards.first().getByTestId('labeluse-status')).toHaveText('Μη εγκεκριμένο'); // complete, but nobody approved it
  await expect(cards.first()).toContainText('Δόση: 0,025 ml/στρ.'); // exactly as typed, not 0,03
  await expect(cards.first()).toContainText('Αναμονή πριν από τη συγκομιδή (ημέρες): 7 ημέρες');

  // 2) PHI «δεν αναγράφεται» and REI left empty → blocked
  await page.getByTestId('labeluse-add').click();
  await page.getByRole('button', { name: 'Ρόκα' }).click();
  await page.getByRole('button', { name: 'Από–έως' }).click();
  await page.getByRole('button', { name: 'g/στρ.', exact: true }).click();
  await inputs(page).nth(0).fill('0,25');
  await inputs(page).nth(1).fill('0,15'); // «from» above «to»
  await page.getByTestId('labeluse-save').click();
  await expect(page.locator('main .msg.error')).toHaveCount(1);
  await inputs(page).nth(1).fill('0,35');
  await page.getByRole('button', { name: 'Δεν αναγράφεται' }).nth(2).click(); // PHI
  await expect(inputs(page).nth(2)).toBeDisabled();
  await page.getByTestId('labeluse-save').click();
  const rocket = cards.filter({ hasText: 'Ρόκα' });
  await expect(rocket.getByTestId('labeluse-status')).toContainText('Λείπουν στοιχεία');
  await expect(rocket).toContainText('Δόση: 0,25 – 0,35 g/στρ.');
  await expect(rocket).toContainText('Αναμονή πριν από τη συγκομιδή (ημέρες): Δεν αναγράφεται');
  await expect(rocket).toContainText('Επανείσοδος στο χωράφι (ώρες): Δεν έχει συμπληρωθεί');

  // 3) edit: fix the missing values; reload keeps everything
  await rocket.getByRole('button', { name: 'Επεξεργασία' }).click();
  await page.getByRole('button', { name: 'Δεν αναγράφεται' }).nth(2).click(); // switch off
  await inputs(page).nth(2).fill('5');
  await inputs(page).nth(3).fill('12');
  await inputs(page).nth(4).fill('2');
  await page.getByTestId('labeluse-save').click();
  await expect(rocket.getByTestId('labeluse-status')).toHaveText('Μη εγκεκριμένο');
  await page.reload();
  await tab(page, 'stock');
  await page.getByTestId('labeluse-open').click();
  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: 'Σπανάκι' })).toContainText('0,025 ml/στρ.');
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('the label-details form meets the UX bar in el/tr/en (375 px, targets, axe)', async ({ page }) => {
  const errors = await iphone(page);
  await addProduct(page);
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more');
    await page.getByRole('button', { name: lang, exact: true }).click();
    await tab(page, 'stock');
    if (!(await page.getByTestId('labeluse-save').isVisible())) {
      if (!(await page.getByTestId('labeluse-add').isVisible())) await page.getByTestId('labeluse-open').click();
      await page.getByTestId('labeluse-add').click();
    }
    await page.getByTestId('labeluse-save').click(); // crop missing error
    const found = await page.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > 375) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
      for (const e of document.querySelectorAll('main button:not(:disabled), main input:not(:disabled)')) {
        const r = e.getBoundingClientRect();
        if (r.height < 56 || r.width < 44) out.push(`target ${e.tagName} ${Math.round(r.width)}×${Math.round(r.height)} "${(e.textContent ?? '').trim().slice(0, 20)}"`);
      }
      return out;
    });
    expect(found, lang).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), lang).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('approval: only a complete label can be signed (name + real date); editing a value removes it; archive and undo', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await addProduct(page);
  await page.getByTestId('labeluse-open').click();
  await page.getByTestId('labeluse-add').click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.getByRole('button', { name: 'Μία δόση' }).click();
  await page.getByRole('button', { name: 'ml/στρ.', exact: true }).click();
  await inputs(page).nth(0).fill('0,025');
  await inputs(page).nth(1).fill('7');
  await inputs(page).nth(2).fill('24');
  await page.getByTestId('labeluse-save').click(); // max applications still empty
  const card = page.getByTestId('labeluse');
  await expect(card.getByTestId('labeluse-status')).toContainText('Λείπουν στοιχεία');
  await expect(page.getByTestId('signoff-open')).toHaveCount(0); // an incomplete label cannot be approved

  await card.getByRole('button', { name: 'Επεξεργασία' }).click();
  await inputs(page).nth(3).fill('3');
  await page.getByTestId('labeluse-save').click();
  await expect(card.getByTestId('labeluse-status')).toHaveText('Μη εγκεκριμένο');
  await page.getByTestId('signoff-open').click();
  await page.getByTestId('signoff-save').click(); // no name
  await expect(page.locator('main .msg.error')).toHaveCount(1);
  await page.locator('input.input').nth(0).fill('Test Agronomist');
  await page.locator('input[type=date]').fill('');
  await page.getByTestId('signoff-save').click(); // no date
  await expect(page.locator('main .msg.error')).toContainText('Μη έγκυρη ημερομηνία');
  await page.locator('input[type=date]').fill('2026-11-17');
  await page.getByTestId('signoff-save').click();
  await expect(card.getByTestId('labeluse-status')).toContainText('Εγκεκριμένο από Test Agronomist');
  await expect(page.getByTestId('signoff-open')).toHaveCount(0);

  await page.reload();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('labeluse-open').click();
  await expect(card.getByTestId('labeluse-status')).toContainText('Εγκεκριμένο από Test Agronomist'); // survives reload

  await card.getByRole('button', { name: 'Επεξεργασία' }).click(); // change the PHI 7 → 3
  await inputs(page).nth(1).fill('3');
  await page.getByTestId('labeluse-save').click();
  await expect(card.getByTestId('labeluse-status')).toHaveText('Μη εγκεκριμένο'); // the approval is gone
  await expect(page.getByTestId('signoff-open')).toBeVisible();

  await card.getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(card).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(card).toHaveCount(1);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});
