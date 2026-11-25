import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

const SHOTS = '../docs/design/screenshots-2026-11-23';
async function harvest(page: Page, crates: string) {
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-crates').fill(crates);
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
}
async function openParcel(page: Page) {
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.locator('main [data-testid="parcel-open"]').first().evaluate((el) => (el as HTMLElement).click());
}

test('real farm: 0,8 στρ. and two harvest records (30 + 20 crates) show 62,5 crates/στρ. with both source records; no kilograms; kept after a reload', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction(['parcels'], 'readwrite'); const st = tx.objectStore('parcels'); st.getAll().onsuccess = (e) => { for (const p of (e.target as IDBRequest).result) st.put({ ...p, area_str: '0,8' }); }; tx.oncomplete = () => done(); }; }));
  await page.reload();
  await openParcel(page);
  await expect(page.getByTestId('yield-unknown')).toContainText('άγνωστο – δεν υπάρχουν καταγραφές συγκομιδής');   // before any harvest
  await page.screenshot({ path: `${SHOTS}/yield-before-unknown.png` });
  await page.getByRole('button', { name: 'Επιστροφή' }).click().catch(() => undefined);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await harvest(page, '30');
  await harvest(page, '20');
  await openParcel(page);
  await expect(page.getByTestId('yield-value')).toContainText('62,5 κλούβες/στρ.');
  await expect(page.getByTestId('yield-value')).toContainText('50 κλούβες σε 0,8');
  await page.getByTestId('yield-sources').locator('summary').click();
  await expect(page.getByTestId('yield-source')).toHaveCount(2);
  await expect(page.getByTestId('yield-value')).toContainText('όλες οι καλλιέργειες και όλες οι εποχές');   // the scope is on the screen
  await expect(page.getByTestId('parcel-yield')).not.toContainText('kg');
  await page.getByTestId('parcel-yield').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/yield-after-62-5.png` });
  await page.reload();
  await openParcel(page);
  await expect(page.getByTestId('yield-value')).toContainText('62,5');
  // archiving the planting hides it from the lists but the harvests happened: they still count, tagged
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').first().click();
  await page.getByTestId('planting').getByRole('button', { name: 'Αρχειοθέτηση' }).click();
  await expect(page.getByTestId('planting')).toHaveCount(0);
  await openParcel(page);
  await expect(page.getByTestId('yield-value')).toContainText('62,5 κλούβες/στρ.');
  await expect(page.getByTestId('yield-archived')).toContainText('Περιλαμβάνει 50 κλούβες από αρχειοθετημένες φυτείες');
  await page.getByTestId('yield-bycrop').locator('summary').click();
  await expect(page.getByTestId('yield-crop')).toContainText('Σπανάκι: 62,5 κλούβες/στρ. (50 κλούβες)');
  await page.getByTestId('parcel-yield').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/yield-archived-scope.png` });
  expect(errors).toEqual([]);
});
