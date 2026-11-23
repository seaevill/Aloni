import { readFileSync } from 'node:fs';
import { expect, test, type Page } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// The disaster drill: a real farm with records and photos → a backup file → the phone is wiped (the in-app deletion) → the app starts like a new phone → restore from the file → EVERY record and photo is back, byte for byte.
test.use({ viewport: { width: 375, height: 812 } });

async function png(page: Page, seed: number): Promise<Buffer> {
  const url = await page.evaluate((seed) => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 600, 400); gr.addColorStop(0, `hsl(${seed * 90},70%,40%)`); gr.addColorStop(1, `hsl(${seed * 90 + 120},70%,60%)`); g.fillStyle = gr; g.fillRect(0, 0, 600, 400); return c.toDataURL('image/png'); }, seed);
  return Buffer.from(url.split(',')[1]!, 'base64');
}

/** What is on the phone, read straight from the database: the number of rows per table and the SHA-256 of every photo. */
const snapshot = (page: Page) => page.evaluate(() => new Promise<{ counts: Record<string, number>; photos: string[] }>((ok, bad) => {
  const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
  o.onsuccess = () => {
    const db = o.result; const names = ['parcels', 'plantings', 'crops', 'products', 'label_uses', 'stock_lots', 'stock_movements', 'media'].filter((n) => db.objectStoreNames.contains(n));
    const tx = db.transaction(names, 'readonly'); const counts: Record<string, number> = {}; let photos: string[] = [];
    for (const n of names) { const r = tx.objectStore(n).getAll(); r.onsuccess = () => { counts[n] = r.result.length; if (n === 'media') photos = (r.result as Array<{ sha256: string }>).map((m) => m.sha256).sort(); }; }
    tx.oncomplete = () => { db.close(); ok({ counts, photos }); }; tx.onerror = () => bad(new Error('tx'));
  };
}));

test('backup → wipe the phone → restore: every record and photo is back', async ({ page }) => {
  test.setTimeout(180_000);
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await png(page, 1) });
  await expect(page.getByTestId('photo-count')).toContainText('1 φωτογραφία');
  await page.locator('input[type=file]').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: await png(page, 2) });
  await expect(page.getByTestId('photo-count')).toContainText('2 φωτογραφίες');
  const before = await snapshot(page);
  expect(before.counts.parcels).toBeGreaterThan(0); expect(before.counts.media).toBe(2); expect(before.photos).toHaveLength(2);

  // 1. the backup file
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Εξαγωγή αντιγράφου' }).click();
  const path = test.info().outputPath('drill-backup.json');
  await (await download).saveAs(path);

  // 2. the phone is wiped with the app's own deletion (backup is fresh, the name is typed)
  await page.getByTestId('open-info').click();
  await page.getByTestId('account-open').click();
  await page.getByTestId('account-typed').fill('Το κτήμα μου');
  await page.getByTestId('account-wipe').click();
  await expect(page.getByTestId('onboarding')).toBeVisible({ timeout: 20_000 });                 // a new phone
  await page.getByTestId('onboarding-skip').click();
  const empty = await snapshot(page);
  expect(Object.values(empty.counts).reduce((a, b) => a + b, 0)).toBe(0);                          // nothing is left
  expect(empty.photos).toEqual([]);

  // 3. the restore
  await page.locator('nav.tabs [data-tab="more"]').click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Επαναφορά από αντίγραφο' }).click()]);   // the real path: the button, then the phone's file picker
  await chooser.setFiles({ name: 'aloni-backup.json', mimeType: 'application/json', buffer: readFileSync(path) });
  await expect.poll(async () => (await snapshot(page)).counts, { timeout: 20_000 }).toEqual(before.counts);      // the restore has run (the confirmation line can vanish when the farm changes and the screen redraws)
  const after = await snapshot(page);
  expect(after.counts).toEqual(before.counts);                                                     // every table has its rows again
  expect(after.photos).toEqual(before.photos);                                                     // and every photo is the same file (SHA-256)
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('photo-count')).toContainText('2 φωτογραφίες');
  await page.getByRole('button', { name: 'Επιστροφή' }).click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.locator('main')).toContainText('Κάτω Κάμπος');
});
