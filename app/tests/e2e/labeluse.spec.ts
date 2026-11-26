import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
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
  await expect(cards.first().getByTestId('labeluse-status')).toHaveText('Χωρίς υπογραφή γεωπόνου'); // complete, but no agronomist has signed it
  await expect(cards.first()).toContainText('Δόση: 0,025 ml/στρ.'); // exactly as typed, not 0,03
  await expect(cards.first()).toContainText('Αναμονή πριν από τη συγκομιδή: 7 ημέρες');

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
  await expect(rocket.getByTestId('labeluse-status')).toContainText('ΑΠΟΚΛΕΙΣΜΕΝΟ');
  await expect(rocket).toHaveClass(/blocked/); // blocked looks stronger than «no signature»: red frame and a red badge
  const bg = (loc: ReturnType<Page['locator']>) => loc.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await bg(rocket.getByTestId('labeluse-status'))).toBe('rgb(110, 23, 8)');
  expect(await bg(cards.filter({ hasText: 'Σπανάκι' }).getByTestId('labeluse-status'))).not.toBe('rgb(110, 23, 8)');
  await expect(rocket).toContainText('Δόση: 0,25 – 0,35 g/στρ.');
  await expect(rocket).toContainText('Αναμονή πριν από τη συγκομιδή: Δεν αναγράφεται');
  await expect(rocket).toContainText('Επανείσοδος στο χωράφι: Δεν έχει συμπληρωθεί');

  // 3) edit: fix the missing values; reload keeps everything
  await rocket.getByRole('button', { name: 'Επεξεργασία' }).click();
  await page.getByRole('button', { name: 'Δεν αναγράφεται' }).nth(2).click(); // switch off
  await inputs(page).nth(2).fill('5');
  await inputs(page).nth(3).fill('12');
  await inputs(page).nth(4).fill('2');
  await page.getByTestId('labeluse-save').click();
  await expect(rocket.getByTestId('labeluse-status')).toHaveText('Χωρίς υπογραφή γεωπόνου');
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
  await expect(card.getByTestId('labeluse-status')).toContainText('ΑΠΟΚΛΕΙΣΜΕΝΟ');
  await expect(page.getByTestId('signoff-open')).toHaveCount(0); // an incomplete label cannot be approved

  await card.getByRole('button', { name: 'Επεξεργασία' }).click();
  await expect(inputs(page).nth(0)).toHaveValue('0,025');          // the edit form is in place with the stored values BEFORE the max-applications box is filled (CI failure context 2026-11-26: the save after this edit left the label blocked)
  await expect(inputs(page).nth(3)).toHaveValue('');
  await inputs(page).nth(3).fill('3');
  await expect(inputs(page).nth(3)).toHaveValue('3');
  await page.getByTestId('labeluse-save').click();
  await expect(card.getByTestId('labeluse-status')).toHaveText('Χωρίς υπογραφή γεωπόνου');
  await expect(card.getByTestId('labeluse-why')).toContainText('η συγκομιδή μένει κλειστή');   // unsigned: the card says WHY harvest is closed
  await page.getByTestId('signoff-open').click();
  await page.getByTestId('signoff-save').click(); // no name
  await expect(page.locator('main .msg.error')).toHaveCount(1);
  await page.locator('input.input').nth(0).fill('Test Agronomist');
  await page.locator('input[type=date]').fill('');
  await page.getByTestId('signoff-save').click(); // no date
  await expect(page.locator('main .msg.error')).toContainText('Μη έγκυρη ημερομηνία');
  await page.locator('input[type=date]').fill('2026-11-17');
  await page.getByTestId('signoff-note').fill('seen at the shop');                                   // the note and a photo are kept WITH the approval
  await page.locator('input[type=file]').setInputFiles({ name: 'sign.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByTestId('signoff-form').locator('.photos')).toBeVisible();
  await page.getByTestId('signoff-save').click();
  await expect(card.getByTestId('labeluse-status')).toContainText('Υπογραφή γεωπόνου: Test Agronomist');
  await expect(card.getByTestId('signoff-shown-note')).toHaveText('seen at the shop');
  await expect(card.getByTestId('labeluse-why')).toHaveCount(0);                                     // signed: no «closed» reason any more
  await expect(card.locator('.photos')).toBeVisible();
  await expect(page.getByTestId('signoff-open')).toHaveCount(0);

  await page.reload();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('labeluse-open').click();
  await expect(card.getByTestId('labeluse-status')).toContainText('Υπογραφή γεωπόνου: Test Agronomist'); // survives reload
  await expect(card.getByTestId('signoff-shown-note')).toHaveText('seen at the shop');                 // the note survives it too

  await card.getByRole('button', { name: 'Επεξεργασία' }).click(); // change the PHI 7 → 3: a SIGNED label is never edited in place (0019)
  await expect(page.getByTestId('labeluse-signed-note')).toBeVisible();
  await inputs(page).nth(2).fill('3'); // (the first input of the form is the reason; the PHI box moved one place down)
  await page.getByTestId('labeluse-save').click();
  await expect(page.getByTestId('labeluse-signed-note').getByRole('alert')).toBeVisible();   // no reason: refused
  await page.getByTestId('labeluse-reason').fill('manufacturer revised the label');
  await page.getByTestId('labeluse-save').click();
  await expect(card.getByTestId('labeluse-status')).toHaveText('Χωρίς υπογραφή γεωπόνου'); // the NEW label is unsigned; the old one is archived
  await expect(page.getByTestId('signoff-open')).toBeVisible();
  const rows = await page.evaluate(() => new Promise<Array<Record<string, unknown>>>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(['label_uses']).objectStore('label_uses').getAll(); q.onsuccess = () => done(q.result as Array<Record<string, unknown>>); }; }));
  expect(rows).toHaveLength(2);
  const oldRow = rows.find((x) => x.deleted_at)!; const newRow = rows.find((x) => !x.deleted_at)!;
  expect(oldRow.sign_off).toMatchObject({ by: 'Test Agronomist' });                  // the signed row is kept as it was (archived)
  expect(newRow).toMatchObject({ supersedes_id: oldRow.id, change_reason: 'manufacturer revised the label' });
  expect(newRow.sign_off).toBeUndefined();

  await card.getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(card).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(card).toHaveCount(1);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});
