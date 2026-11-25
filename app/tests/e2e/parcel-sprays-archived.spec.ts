import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, spray } from './helpers/farm';

// Review follow-up S6 (docs/reviews/team/2026-11-25-independent-504-507.md): «Τελευταίοι ψεκασμοί» lists the sprayings of the CURRENT plantings only,
// while the «Χρονολόγιο» keeps the archived ones. The difference is stated on screen, with the count, instead of the records silently disappearing.
const archiveAllPlantings = (page: Page) => page.evaluate(() => new Promise<void>((ok, bad) => {
  const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
  o.onsuccess = () => {
    const tx = o.result.transaction(['plantings'], 'readwrite');
    const store = tx.objectStore('plantings');
    const all = store.getAll();
    tx.oncomplete = () => ok();
    all.onsuccess = () => (all.result as Array<Record<string, unknown>>).forEach((p) => store.put({ ...p, deleted_at: new Date().toISOString() }));
  };
}));

const openParcel = async (page: Page) => {
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('timeline')).toBeVisible();
};

test('a spraying of an archived planting is not in «Τελευταίοι ψεκασμοί», the screen says so with the count, and the timeline still lists it', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-save')).toBeHidden();
  await openParcel(page);
  await expect(page.getByTestId('detail-spray')).toHaveCount(1);           // current planting: listed, and no note
  await expect(page.getByTestId('detail-sprays-archived')).toHaveCount(0);
  await archiveAllPlantings(page);
  await page.reload();
  await openParcel(page);
  await expect(page.getByTestId('detail-spray')).toHaveCount(0);
  await expect(page.getByTestId('detail-sprays-archived')).toHaveText('Ψεκασμοί σε αρχειοθετημένες φυτεύσεις (1) δεν εμφανίζονται εδώ· είναι στο Χρονολόγιο.');
  await expect(page.getByTestId('timeline').locator('[data-testid="timeline-event"][data-kind="spray"]')).toHaveCount(1);
  await page.getByRole('heading', { name: 'Τελευταίοι ψεκασμοί' }).scrollIntoViewIfNeeded();   // same anchor as the «before» picture
  await page.screenshot({ path: '../docs/design/sprays-archived-after-375.png' });
  expect(errors).toEqual([]);
});
