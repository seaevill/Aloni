import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { closeHistory, setup, spray } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

test('«Σήμερα έγιναν» lists each record as a row (type · crop · place · product or crates → destination) and a tap opens its detail', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toBeVisible();
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'job_harvest'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!;
        tx.objectStore('job_harvest').put({ id: 'h-today-1', farm_id: p.farm_id, planting_id: p.id, harvested_at: new Date().toISOString(), crates_str: '12', created_at: new Date().toISOString() });
      };
    };
  }));
  await page.reload();
  const rows = page.getByTestId('today-done-row');
  await expect(rows).toHaveCount(2);
  const sprayRow = rows.filter({ hasText: 'Ψεκασμός' });
  await expect(sprayRow).toContainText('Σπανάκι');
  await expect(sprayRow).toContainText('Kocide 2000');
  const harvestRow = rows.filter({ hasText: 'Συγκομιδή' });
  await expect(harvestRow).toContainText('12');
  await expect(harvestRow).toContainText('άγνωστο – παλιά καταγραφή');
  expect((await harvestRow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  await harvestRow.click();
  const sheet = page.getByTestId('done-sheet');
  await expect(sheet).toContainText('Κάτω Κάμπος');
  await expect(sheet).toContainText('12');
  await sheet.getByTestId('sheet-close').click();
  await sprayRow.click();
  await expect(page.getByTestId('done-sheet')).toContainText('Kocide 2000');
});

test('a harvest saved a second ago says where it went (the answer kept on this phone), not «άγνωστο – παλιά καταγραφή»; the detail agrees', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-dest-store').click();
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  const row = page.getByTestId('today-done-row').filter({ hasText: 'Συγκομιδή' });
  await expect(row).toContainText('Αποθήκη');
  await expect(row).not.toContainText('άγνωστο');
  await row.click();
  await expect(page.getByTestId('done-sheet')).toContainText('Αποθήκη');
  await expect(page.getByTestId('done-sheet')).not.toContainText('άγνωστο');
});
