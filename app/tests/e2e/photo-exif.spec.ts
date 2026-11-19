import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T19: a photo with GPS in its EXIF block is re-encoded: the stored bytes carry no APP1 / «Exif» segment (no location leaves the phone, FACTS: no location tracking).
test('photo with GPS EXIF: the stored bytes have no Exif segment', async ({ page }) => {
  await iphone(page);
  const base64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d')!; g.fillStyle = '#3a7'; g.fillRect(0, 0, 64, 48); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  const jpg = Buffer.from(base64, 'base64');
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), Buffer.from('MM\0*GPSLatitude 38.0 GPSLongitude 23.3', 'binary')]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255]), exif]);
  const withGps = Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]);
  expect(withGps.includes(Buffer.from('GPSLatitude'))).toBe(true);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'gps.jpg', mimeType: 'image/jpeg', buffer: withGps });
  await expect(page.getByTestId('photo-msg')).toHaveText('Η φωτογραφία αποθηκεύτηκε.');
  const found = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const d of dbs) {
      const open = indexedDB.open(d.name as string);
      const db: IDBDatabase = await new Promise((ok) => { open.onsuccess = () => ok(open.result); });
      if (!db.objectStoreNames.contains('media')) { db.close(); continue; }
      const rows: Array<{ data: ArrayBuffer }> = await new Promise((ok) => { const r = db.transaction('media').objectStore('media').getAll(); r.onsuccess = () => ok(r.result); });
      db.close();
      const text = rows.map((r) => new TextDecoder('latin1').decode(new Uint8Array(r.data))).join('|');
      return { rows: rows.length, exif: text.includes('Exif'), gps: text.includes('GPSLatitude') };
    }
    return { rows: 0, exif: false, gps: false };
  });
  expect(found.rows).toBe(1);
  expect(found.exif).toBe(false);
  expect(found.gps).toBe(false);
});

test('backup screen shows the warning about workers’ names', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('backup-sensitive')).toContainText('Περιέχει ονόματα εργατών');
});
