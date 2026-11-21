import { expect, test, type Page } from '@playwright/test';
import { athensInput, fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

test('Σήμερα: empty farm offers «add a field» first and the demo second; with data it shows only the counts, no «no data» and no demo button', async ({ page }) => {
  await iphone(page);
  await expect(page.getByTestId('empty-state').locator('button')).toHaveCount(2);
  await expect(page.getByTestId('empty-state').locator('button').first()).toHaveText('Προσθήκη χωραφιού');
  await page.getByTestId('empty-state').locator('button').first().click(); // T7: opens the parcel form in ONE tap
  await expect(page.getByTestId('parcel-save')).toBeVisible();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await tab(page, 'today');
  await expect(page.getByTestId('today-counts')).toContainText('Χωράφια: 1');
  await expect(page.getByTestId('empty-state')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Φόρτωση επίδειξης');
});

test('adding label details for a crop does not put a crop that nobody planted on the Καλλιέργειες list; a real product shows its stock', async ({ page }) => {
  await iphone(page);
  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Kocide 2000');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click();
  await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await page.getByTestId('labeluse-open').click();
  await page.getByTestId('labeluse-add').click();
  await page.getByRole('button', { name: 'Σπανάκι' }).click();
  await page.getByTestId('labeluse-save').click();
  await expect(page.getByTestId('labeluse')).toHaveCount(1);
  await tab(page, 'crops');
  await expect(page.locator('main .card')).toHaveCount(0); // the crop exists for the label, but nothing is planted
  await tab(page, 'stock');
  await expect(page.getByTestId('product-stock')).toHaveText('Υπόλοιπο: 0 kg');
});

test('the GPS line names latitude and longitude, and a negative balance uses a real minus sign', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 38.0012, longitude: 23.3501, accuracy: 12 });
  await iphone(page);
  await tab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await page.getByRole('button', { name: 'Θέση από το GPS' }).click();
  await expect(page.getByTestId('pin')).toHaveText('Γεωγραφικό πλάτος 38,0012 · μήκος 23,3501 (±12 μ.)');
});

test('the «expires soon» warning follows the setting in More (60 days by default, changeable); EC can be mS/cm', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  const inDays = (await athensInput(page, 45 * 86_400_000)).slice(0, 10);
  await tab(page, 'stock');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Kocide 2000');
  await page.getByRole('button', { name: 'Μυκητοκτόνο' }).click();
  await page.getByRole('button', { name: 'Κιλά (kg)' }).click();
  await page.getByTestId('product-save').click();
  await page.getByTestId('stock-open').click();
  await page.getByTestId('receive-open').click();
  await page.locator('input[type=date]').fill(inDays);
  await page.locator('main input.input').nth(2).fill('2');
  await page.getByTestId('receive-save').click();
  await expect(page.getByTestId('lot-flag')).toHaveText('Λήγει σύντομα'); // 45 days away, default 60
  await tab(page, 'more');
  await expect(page.getByTestId('soon-days')).toHaveValue('60');
  await page.getByTestId('soon-days').fill('abc');
  await page.getByRole('button', { name: 'Αποθήκευση' }).last().click();
  await expect(page.locator('main .msg.error')).toBeVisible();
  await page.getByTestId('soon-days').fill('30');
  await page.getByRole('button', { name: 'Αποθήκευση' }).last().click();
  await expect(page.getByTestId('settings-saved')).toBeVisible();
  await tab(page, 'stock');
  await page.getByTestId('stock-open').click();
  await expect(page.getByTestId('lot')).toBeVisible();
  await expect(page.getByTestId('lot-flag')).toHaveCount(0); // 45 days is outside 30
  await tab(page, 'parcels');
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  await page.getByTestId('analysis-add-soil').click();
  await page.locator('input[type=date]').fill('2026-11-10');
  await page.locator('main input.input').nth(3).fill('1,2');
  await page.getByRole('button', { name: 'mS/cm' }).click();
  await page.getByTestId('analysis-save').click();
  await expect(page.getByTestId('analysis')).toContainText('EC: 1,2 mS/cm');
});
