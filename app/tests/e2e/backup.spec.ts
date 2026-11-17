import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// Real data in (the data controller details), export a file, open the app on a "new phone" (a fresh browser profile), restore, same data.
test('export a backup and restore it on a new phone', async ({ page, browser }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('backup-note')).toContainText('ποτέ');
  await page.getByTestId('open-info').click();
  const inputs = page.locator('input.input');
  await inputs.nth(0).fill('Test Person'); await inputs.nth(1).fill('Test street 1'); await inputs.nth(2).fill('+30 000 0000000');
  await page.getByRole('button', { name: 'Αποθήκευση' }).click();
  await expect(page.getByTestId('sync-chip')).toContainText('μη συγχρονισμένο');
  await expect(page.getByTestId('backup-stale')).toBeVisible(); // data on the phone, no backup yet
  await page.getByRole('button', { name: 'Επιστροφή' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Εξαγωγή αντιγράφου' }).click();
  const file = (await download).suggestedFilename();
  const path = test.info().outputPath(file);
  await (await download).saveAs(path);
  expect(file).toMatch(/^aloni-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(readFileSync(path, 'utf8')).settings.map((s: { key: string }) => s.key)).toEqual(['controller']);
  await expect(page.getByTestId('backup-stale')).toHaveCount(0);
  await expect(page.getByTestId('backup-note')).not.toContainText('ποτέ');

  const phone2 = await (await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 375, height: 667 } })).newPage();
  await iphone(phone2);
  await phone2.locator('nav.tabs [data-tab="more"]').click();
  await phone2.locator('input[type=file]').setInputFiles(path);
  await expect(phone2.getByTestId('backup-msg')).toContainText('Έγινε επαναφορά');
  await phone2.getByTestId('open-info').click();
  await expect(phone2.getByTestId('info-privacy')).toContainText('Test Person');
  await phone2.locator('nav.tabs [data-tab="today"]').click();
  await phone2.locator('nav.tabs [data-tab="more"]').click();
  await phone2.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not a backup') });
  await expect(phone2.getByTestId('backup-msg')).toContainText('δεν είναι αντίγραφο');
});
