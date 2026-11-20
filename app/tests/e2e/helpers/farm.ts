import { expect, type Page } from '@playwright/test';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();
const inputs = (page: Page) => page.locator('main input.input');

/** A real farm with everything a spray needs: parcel, planting, product with a COMPLETE label (optionally signed), a lot of 4,5 kg and a worker. */
export async function setup(page: Page, signed: boolean) {
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

export async function spray(page: Page) {
  await page.getByTestId('spray-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await fillStart(page);
  await expect(page.getByTestId('spray-dose')).toHaveValue('');           // nothing is filled in for the owner
  await page.getByTestId('spray-dose-same').click();                       // «Ίδια με την ετικέτα»: a tap copies the label's own single dose and unit
  await expect(page.getByTestId('spray-dose')).toHaveValue('0,025');
  await page.locator('.seg button[aria-pressed="true"]', { hasText: 'ml/στρ.' }).waitFor();
  // the only lot is preselected (exactly one lot that is not expired)
  await page.getByTestId('spray-qty').fill('0,25');
}


/** The records of the past live on «Ιστορικό»: open it unless it is already open. */
export async function openHistory(page: Page): Promise<void> {
  if (await page.getByTestId('history').isVisible()) return;
  if (!(await page.getByTestId('history-open').isVisible())) await tab(page, 'today');      // after a reload the app returns to the tab it was on (T7)
  await page.getByTestId('history-open').click();
}

/** Back from «Ιστορικό» to Σήμερα (the cut counters live there). */
export async function closeHistory(page: Page): Promise<void> {
  if (await page.getByTestId('history').isVisible()) await page.getByTestId('history-back').click();
}


/** The start of a spraying is required and never pre-filled: type «one hour ago» (Athens clock), or the given local time «YYYY-MM-DDTHH:mm». */
export async function fillStart(page: Page, local?: string): Promise<void> {
  const value = local ?? await page.evaluate(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(Date.now() - 3_600_000)).replace(' ', 'T'));
  await page.getByTestId('spray-start').fill(value);
}
