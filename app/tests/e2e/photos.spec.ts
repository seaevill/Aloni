import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

/** A real PNG made in the browser: `w`×`h`, a gradient shifted by `seed` so that different seeds are different pictures. */
async function png(page: Page, w: number, h: number, seed: number): Promise<Buffer> {
  const url = await page.evaluate(([w, h, seed]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, `hsl(${seed * 90},70%,40%)`); grad.addColorStop(1, `hsl(${seed * 90 + 120},70%,60%)`);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    return c.toDataURL('image/png');
  }, [w, h, seed]);
  return Buffer.from(url.split(',')[1], 'base64');
}

test('add photos offline: shrunk to 2000 px, the same photo only once, kept after reload, inside the backup, no dialog', async ({ page, context }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('empty-state').locator('button')).toHaveCount(1); // the one action: add a photo

  const big = { name: 'a.png', mimeType: 'image/png', buffer: await png(page, 3000, 1500, 1) };
  await page.locator('input[type=file]').setInputFiles(big);
  await expect(page.getByTestId('photo-msg')).toHaveText('Η φωτογραφία αποθηκεύτηκε.');
  await expect(page.getByTestId('photo-count')).toContainText('1 φωτογραφία');
  await expect(page.locator('.photo').first()).toHaveAttribute('width', '2000'); // stored size, not the 3000 px original
  await expect(page.locator('.photo').first()).toHaveAttribute('height', '1000');

  await page.locator('input[type=file]').setInputFiles(big); // the very same photo again
  await expect(page.getByTestId('photo-msg')).toContainText('υπάρχει ήδη');
  await expect(page.getByTestId('photo-count')).toContainText('1 φωτογραφία');
  await page.locator('input[type=file]').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: await png(page, 800, 600, 2) });
  await expect(page.getByTestId('photo-count')).toContainText('2 φωτογραφίες');
  await expect(page.getByTestId('sync-chip')).toContainText('Αποθηκεύτηκε στο τηλέφωνο');

  await page.locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') });
  await expect(page.getByTestId('photo-msg')).toContainText('Δεν αποθηκεύτηκε'); // unreadable: nothing stored, the farmer is told
  await expect(page.getByTestId('photo-count')).toContainText('2 φωτογραφίες');

  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('photo')).toHaveCount(2);
  await page.getByTestId('photo').first().click(); // full size and back
  await expect(page.locator('.photo.big')).toBeVisible();
  await page.getByRole('button', { name: 'Κλείσιμο' }).click();
  await page.getByRole('button', { name: 'Επιστροφή' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Εξαγωγή αντιγράφου' }).click();
  const path = test.info().outputPath('backup.json');
  await (await download).saveAs(path);
  const media = JSON.parse(readFileSync(path, 'utf8')).media as Array<{ sha256: string; width: number; data_base64: string }>;
  expect(media).toHaveLength(2);
  expect(media.map((m) => m.width).sort((a, b) => a - b)).toEqual([800, 2000]);
  expect(new Set(media.map((m) => m.sha256)).size).toBe(2);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('while the demo farm is active no photo can be added', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn').first().click();
  await page.getByTestId('open-photos').click();
  await expect(page.getByTestId('photos-demo-note')).toBeVisible();
  await expect(page.getByTestId('photo-add')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toHaveCount(0);
});
