import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

// A harvest record → «Ετικέτα κασέλας»: crop, day, parcel, crates, a lot code and a QR code (plain ASCII text); nothing personal, nothing advisory; printable.
test('a harvest of today opens its crate label: crop, day, parcel, crates, lot and a QR code; no person on it', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'job_harvest'], 'readwrite');
      const pl = tx.objectStore('plantings').getAll();
      tx.oncomplete = () => ok();
      pl.onsuccess = () => {
        const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!;
        tx.objectStore('job_harvest').put({ id: '3f2a9c1e-7b44-4d0a-8c11-aa00bb22cc33', farm_id: p.farm_id, planting_id: p.id, harvested_at: new Date().toISOString(), crates_str: '12', created_at: new Date().toISOString() });
      };
    };
  }));
  await page.reload();
  await page.getByTestId('today-done-row').filter({ hasText: 'Συγκομιδή' }).click();
  await expect(page.getByTestId('done-sheet')).toBeVisible();
  await page.getByTestId('crate-open').click();
  const label = page.getByTestId('crate-label');
  await expect(label).toBeVisible();
  await expect(label.getByTestId('crate-crop')).toHaveText('Σπανάκι');
  await expect(label.getByTestId('crate-parcel')).toHaveText('Κάτω Κάμπος');
  await expect(label.getByTestId('crate-crates')).toContainText('12');
  await expect(label.getByTestId('crate-lot')).toHaveText('Παρτίδα 3F2A9C1E');
  await expect(label.getByTestId('crate-qr')).toBeVisible();
  await expect(label.getByTestId('crate-code')).toHaveText(/^ALONI\/LOT\/3F2A9C1E\/spinach\/\d{4}-\d{2}-\d{2}\/12$/);
  await expect(label).not.toContainText(/Γιώργος|Ahmet|Bora/);                         // no person on the label
  await expect(label).not.toContainText(/ασφαλ/i);
  await expect(page.getByTestId('crate-print')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
