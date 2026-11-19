import { expect, test, type Page } from '@playwright/test';
import { setup, spray, openHistory, closeHistory } from './helpers/farm';
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
  await closeHistory(page);
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
  await openHistory(page);
  const card = page.getByTestId('spray');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Ψέκασε: Γιώργος');
  await expect(card.getByTestId('spray-phi')).toContainText('Αναμονή λήγει');
  await expect(card.getByTestId('spray-rei')).toContainText('Επανείσοδος από');
  await expect(card.getByTestId('spray-phi-unknown')).toHaveCount(0);
  await closeHistory(page);
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'from'); // «Κοπή από …» from the signed label
  await closeHistory(page);
  await expect(page.getByTestId('cut-line').first()).toContainText('Κοπή από');
  await closeHistory(page);
  await expect(page.getByTestId('cut-source').first()).toHaveText('Πηγή: υπογεγραμμένη ετικέτα');
  await tab(page, 'stock');
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 4,25 kg'); // 4,5 − 0,25, exact
  await expect(page.getByTestId('movement').last()).toHaveText('−0,25 · ψεκασμός');
  await page.reload();
  await openHistory(page);
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
  await openHistory(page);
  const card = page.getByTestId('spray');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Χωρίς υπογραφή γεωπόνου');
  await expect(card.getByTestId('spray-phi-unknown')).toContainText('Άγνωστη αναμονή');
  await expect(card.getByTestId('spray-phi')).toHaveCount(0);
  await closeHistory(page);
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'unknown'); // unknown waiting period: «άγνωστο», blocked
  await closeHistory(page);
  await expect(page.getByTestId('cut-line').first()).toContainText('άγνωστο');

  await openHistory(page);
  await card.getByTestId('wait-open').click(); // Bora types the label's values: a NEW row, the original stays
  await page.getByTestId('wait-phi').fill('7,5'); await page.getByTestId('wait-rei').fill('24');
  await page.getByTestId('wait-save').click();
  await expect(page.locator('main .msg.error')).toHaveCount(2); // a PHI of 7,5 is refused, never rounded; and no reason was written
  await page.getByTestId('wait-phi').fill('7');
  await page.getByTestId('wait-save').click();
  await expect(page.getByTestId('wait-reason-error')).toBeVisible(); // a correction without a reason is refused
  await page.getByTestId('wait-reason').fill('τιμές από την ετικέτα');
  await page.getByTestId('wait-save').click();
  await openHistory(page);
  await expect(page.getByTestId('spray')).toHaveCount(1); // still one spray on the screen
  await expect(card.getByTestId('spray-phi')).toContainText('Αναμονή λήγει');
  await closeHistory(page);
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'from'); // his entered value gives a date, and it still has to run out
  await closeHistory(page);
  await expect(page.getByTestId('cut-source').first()).toHaveText('Πηγή: από ετικέτα – καταχώριση ιδιοκτήτη'); // the source is shown
  await openHistory(page);
  await expect(card.getByTestId('spray-manual')).toHaveText('Τιμή που καταχωρίσατε εσείς από την ετικέτα');
  await expect(card.getByTestId('wait-open')).toHaveCount(0); // once known it cannot be entered again (it could only shorten it)
  const rows = await page.evaluate(() => new Promise<number>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_spray').objectStore('job_spray').count(); q.onsuccess = () => res(q.result); }; }));
  expect(rows).toBe(2); // the original and the amending row
});

test('the spray form meets the UX bar in el/tr/en (375 px, targets, axe)', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('spray-open').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await tab(page, 'more'); await page.getByRole('button', { name: lang, exact: true }).click(); await tab(page, 'today');
    await closeHistory(page);
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

test('a spraying entered 10 days late: refused without «Λόγος καθυστέρησης», recorded and marked with it', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await spray(page);
  const tenDaysAgo = await page.evaluate(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - 10 * 86400000).toISOString().replace(/:\d{2}\.\d{3}Z$/, ''));
  await page.locator('input[type=datetime-local]').fill(tenDaysAgo);
  await expect(page.getByTestId('spray-late-reason')).toBeVisible();
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-late-error')).toBeVisible(); // nothing saved without the reason
  await page.getByTestId('spray-late-reason').fill('Ξέχασα να το γράψω');
  await page.getByTestId('spray-save').click();
  await expect(page.getByText('καθυστερημένη καταχώριση')).toBeVisible();
});

test('a label an UNSIGNED spray used is not edited in place: a change makes a NEW label with a reason; editing that replacement keeps the link', async ({ page }) => {
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await tab(page, 'stock');
  await page.getByTestId('labeluse-open').click();
  const card = page.getByTestId('labeluse');
  await card.getByRole('button', { name: 'Επεξεργασία' }).click();
  await expect(page.getByTestId('labeluse-signed-note')).toBeVisible();   // used by a spray: the note appears although nobody signed it
  await inputs(page).nth(2).fill('9');                                    // (the reason box is the first input; PHI is the third)
  await page.getByTestId('labeluse-save').click();
  await expect(page.getByTestId('labeluse-signed-note').getByRole('alert')).toBeVisible();   // no reason: refused
  await page.getByTestId('labeluse-reason').fill('label revised');
  await page.getByTestId('labeluse-save').click();
  await expect(page.getByTestId('labeluse-signed-note')).toHaveCount(0);   // saved: the form is closed
  const rows = () => page.evaluate(() => new Promise<Array<Record<string, unknown>>>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(['label_uses']).objectStore('label_uses').getAll(); q.onsuccess = () => done(q.result as Array<Record<string, unknown>>); }; }));
  let all = await rows();
  expect(all).toHaveLength(2);
  const oldRow = all.find((x) => x.deleted_at)!; const newRow = all.find((x) => !x.deleted_at)!;
  expect(newRow).toMatchObject({ supersedes_id: oldRow.id, change_reason: 'label revised', phi_days: '9' });
  await card.getByRole('button', { name: 'Επεξεργασία' }).click();     // the replacement is not used yet: edited in place, the link and the reason stay
  await expect(page.getByTestId('labeluse-signed-note')).toHaveCount(0);
  await inputs(page).nth(1).fill('10');
  await page.getByTestId('labeluse-save').click();
  await expect(card.getByTestId('labeluse-status')).toBeVisible();
  all = await rows();
  expect(all).toHaveLength(2);
  expect(all.find((x) => !x.deleted_at)).toMatchObject({ supersedes_id: oldRow.id, change_reason: 'label revised', phi_days: '10' });
});
