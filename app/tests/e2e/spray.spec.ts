import { expect, test, type Page } from '@playwright/test';
import { athensInput, fixClock } from './helpers/clock';
import { setup, spray, openHistory, closeHistory, fillStart } from './helpers/farm';
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
  await fillStart(page);
  await page.getByTestId('spray-dose-same').click();                       // the dose is not prefilled: a tap copies the label's
  await page.getByTestId('spray-qty').fill('0,25');
  await expect(page.getByTestId('spray-flags')).toHaveCount(0); // signed, in range, in date, stock enough
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toHaveText('Ο ψεκασμός καταγράφηκε.');
  await expect(page.getByTestId('today-done-row')).toContainText('Ψεκασμός · Σπανάκι · Kocide 2000');   // «who did what today» for the owner
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
  await expect(page.getByTestId('cut-line').first()).toContainText('αναμονή έως');
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
  await expect(page.getByTestId('cut-line').first()).toContainText('Λείπει αναμονή');

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
  await expect(page.getByTestId('cut').first()).toHaveAttribute('data-state', 'unknown'); // m9 S-NEW-1: his typed value is kept, but the label is an unsigned draft: the planting stays closed
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
  await fixClock(page);
  await iphone(page);
  await setup(page, true);
  await spray(page);
  const tenDaysAgo = await athensInput(page, -10 * 86_400_000);
  await page.locator('input[type=datetime-local]').nth(1).fill(tenDaysAgo);   // the END (the first one is the start)
  await fillStart(page, new Date(Date.parse(`${tenDaysAgo}:00Z`) - 3_600_000).toISOString().slice(0, 16));
  await expect(page.getByTestId('spray-late-reason')).toBeVisible();
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-late-error')).toBeVisible(); // nothing saved without the reason
  await page.getByTestId('spray-late-reason').fill('Ξέχασα να το γράψω');
  await expect(page.getByTestId('spray-flags').getByText('καθυστερημένη καταχώριση')).toBeVisible();   // the flag is shown in the form BEFORE saving
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toBeVisible();                                         // the form closes on save: the flag is not on Σήμερα any more (the old check raced that)
  const stored = await page.evaluate(() => new Promise<Array<{ late_reason?: string }>>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_spray').objectStore('job_spray').getAll(); q.onsuccess = () => res(q.result as Array<{ late_reason?: string }>); }; }));
  expect(stored.map((x) => x.late_reason)).toEqual(['Ξέχασα να το γράψω']);                            // the record carries the reason: it is marked late
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
  await expect(page.getByTestId('labeluse-save')).toHaveCount(0);                    // the form closed = the save finished (the card's status was visible BEFORE the save: waiting on it read the old row on a slow runner)
  await expect.poll(async () => (await rows()).find((x) => !x.deleted_at)).toMatchObject({ supersedes_id: oldRow.id, change_reason: 'label revised', phi_days: '10' });
  expect(await rows()).toHaveLength(2);
});

test('«Διόρθωση»: every field can be corrected with a reason; the original stays next to it; a changed quantity moves the stock exactly; the end can not go earlier', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await openHistory(page);
  await page.getByTestId('spray-correct-open').click();
  await page.getByTestId('corr-dose').fill('0,03');
  await page.getByTestId('corr-qty').fill('0,5');
  await page.getByTestId('corr-save').click();
  await expect(page.getByTestId('corr-reason-error')).toBeVisible();   // no reason: refused
  await page.getByTestId('corr-reason').fill('typed wrong');
  const when = await page.getByTestId('corr-time').inputValue();
  const earlier = new Date(`${when}:00Z`); earlier.setUTCDate(earlier.getUTCDate() - 1);
  await page.getByTestId('corr-time').fill(earlier.toISOString().slice(0, 16));
  await page.getByTestId('corr-save').click();
  await expect(page.getByTestId('corr-earlier')).toBeVisible();        // the waiting period would end earlier than the original: refused
  await page.getByTestId('corr-time').fill(when);
  await page.getByTestId('corr-save').click();
  const card = page.getByTestId('spray');
  await expect(card).toHaveCount(1);                                   // the correction is the record in force
  await expect(card.getByTestId('spray-trail')).toContainText('δόση 0,025');   // the original is shown next to it
  await expect(card.getByTestId('spray-why')).toContainText('typed wrong');
  await expect(card.getByTestId('spray-phi')).toContainText('Αναμονή λήγει');  // the waiting periods are kept
  await closeHistory(page);
  await tab(page, 'stock');
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot-balance')).toHaveText('Υπόλοιπο: 4 kg'); // 4,5 − 0,25 (spray) + 0,25 (taken back) − 0,5 (corrected quantity), exact
  await page.reload();
  await openHistory(page);
  await expect(page.getByTestId('spray')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('TANK MIX: two products in one go, each its own record (own label, dose, waiting period) joined by a mix; shown together; the corrections stay per product', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await tab(page, 'stock');
  await page.locator('main').getByRole('button', { name: 'Προσθήκη προϊόντος' }).click();
  await inputs(page).nth(0).fill('Score 25');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click(); await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await tab(page, 'today');
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await fillStart(page);
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByTestId('spray-dose-same').click();                  // nothing is prefilled: a tap copies the label's dose
  await expect(page.getByTestId('spray-dose')).toHaveValue('0,025');
  await page.locator('.seg button[aria-pressed="true"]', { hasText: 'ml/στρ.' }).waitFor();
  await page.getByTestId('spray-qty-unknown').check();                    // the only lot is preselected and needs a quantity: «Δεν ξέρω» keeps this test about the mix
  await page.getByTestId('spray-save-mix').click();                      // product 1 saved; the form stays for product 2
  await expect(page.getByTestId('spray-mix-note')).toBeVisible();
  await page.getByRole('button', { name: 'Score 25' }).click();
  await page.getByTestId('spray-dose').fill('0,05');
  await page.getByRole('button', { name: 'ml/στρ.', exact: true }).click();
  await page.getByTestId('spray-save').click();
  await openHistory(page);
  const cards = page.getByTestId('spray');
  await expect(cards).toHaveCount(2);                                    // one record per product
  await expect(cards.first().getByTestId('spray-mix')).toContainText('Μείγμα με:');
  await expect(cards.last().getByTestId('spray-mix')).toContainText('Μείγμα με:');
  const mixIds = await page.evaluate(() => new Promise<string[]>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_spray').objectStore('job_spray').getAll(); q.onsuccess = () => done((q.result as Array<{ mix_id?: string }>).map((x) => String(x.mix_id))); }; }));
  expect(new Set(mixIds).size).toBe(1); expect(mixIds[0]).not.toBe('undefined');   // the same mix id on both
  await cards.first().getByTestId('spray-correct-open').click();                   // correcting ONE product leaves the mix and the other record alone
  await page.getByTestId('corr-dose').fill('0,03');
  await page.getByTestId('corr-reason').fill('typo');
  await page.getByTestId('corr-save').click();
  await expect(cards).toHaveCount(2);
  expect(errors).toEqual([]);
});
