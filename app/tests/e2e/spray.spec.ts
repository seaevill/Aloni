import { expect, test, type Page } from '@playwright/test';
import { setup, spray } from './helpers/farm';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const inputs = (page: Page) => page.locator('main input.input');

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
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'from'); // «Κοπή από …» from the signed label
  await expect(page.getByTestId('cut-line').first()).toContainText('Κοπή από');
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
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'unknown'); // unknown waiting period: «άγνωστο», blocked
  await expect(page.getByTestId('cut-line').first()).toContainText('άγνωστο');

  await card.getByTestId('wait-open').click(); // Bora types the label's values: a NEW row, the original stays
  await page.getByTestId('wait-phi').fill('7,5'); await page.getByTestId('wait-rei').fill('24');
  await page.getByTestId('wait-save').click();
  await expect(page.locator('main .msg.error')).toHaveCount(1); // a PHI of 7,5 is refused, never rounded
  await page.getByTestId('wait-phi').fill('7');
  await page.getByTestId('wait-save').click();
  await expect(page.getByTestId('spray')).toHaveCount(1); // still one spray on the screen
  await expect(card.getByTestId('spray-phi')).toContainText('Αναμονή λήγει');
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'from'); // his entered value gives a date, and it still has to run out
  await expect(card.getByTestId('spray-manual')).toHaveText('Τιμή που καταχωρίσατε εσείς από την ετικέτα');
  await expect(card.getByTestId('wait-open')).toHaveCount(0); // once known it cannot be entered again (it could only shorten it)
  const rows = await page.evaluate(() => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_spray').objectStore('job_spray').count(); q.onsuccess = () => res(q.result); }; }));
  expect(rows).toBe(2); // the original and the amending row
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
