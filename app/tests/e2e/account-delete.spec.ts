import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// E7 «Διαγραφή λογαριασμού»: what happens when a worker or the owner leaves, in plain words; and the one thing that can be done today — deleting the data on THIS phone —
// which stays shut until a fresh backup exists AND the farm name is typed. The photo note is in the privacy text. The Demo farm has nothing to delete.
test.use({ viewport: { width: 375, height: 812 } });

test('the sheet explains both flows and the 3-year records; the wipe button stays shut until a backup and the typed name; then it empties the phone', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-info').click();
  await expect(page.getByTestId('info-photos')).toContainText('GPS');                                // the privacy text covers photos
  await expect(page.getByTestId('info-contacts')).toContainText('3 χρόνια');                         // …and the contacts (customers, worker cards, receivers) and the retention time
  await page.getByTestId('account-open').click();
  const sheet = page.getByTestId('sheet-account');
  await expect(sheet.getByTestId('account-worker')).toContainText('Πρώην εργάτης');                  // the worker is pseudonymised
  await expect(sheet.getByTestId('account-worker')).toContainText('3 χρόνια');                        // records are kept for the legal duty
  await expect(sheet.getByTestId('account-owner')).toContainText('αντίγραφο δεδομένων');
  await expect(sheet.getByTestId('account-server')).toContainText('τίποτα δεν έχει σταλεί');          // honest: sync is off, nothing is on the server
  const wipe = sheet.getByTestId('account-wipe');
  await expect(wipe).toBeDisabled();
  expect((await wipe.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await expect(sheet.getByTestId('account-why')).toContainText('Γράψτε ακριβώς το όνομα');
  await sheet.getByTestId('account-typed').fill('Το κτήμα μου');
  await expect(sheet.getByTestId('account-why')).toContainText('αντίγραφο δεδομένων');              // the words are right, the backup is missing
  await expect(wipe).toBeDisabled();
  const download = page.waitForEvent('download');
  await sheet.getByTestId('account-backup').click();
  expect((await download).suggestedFilename()).toMatch(/^aloni-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(sheet.getByTestId('account-backup-done')).toBeVisible();
  await expect(wipe).toBeEnabled();                                                                   // backup + name: now it opens
  await sheet.getByTestId('account-typed').fill('Το κτήμα');
  await expect(wipe).toBeDisabled();                                                                  // a wrong name closes it again
  await sheet.getByTestId('account-typed').fill('  το ΚΤΉΜΑ μου ');
  await expect(wipe).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await wipe.click();
  await expect(page.getByTestId('onboarding')).toBeVisible({ timeout: 20_000 });                      // the phone is empty: it starts like a new phone (the first-run cards)
  await page.getByTestId('onboarding-skip').click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();                                        // no parcel is left
});

test('the Demo farm has nothing to delete and says so', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-info').click();
  await page.getByTestId('account-open').click();
  await expect(page.getByTestId('account-demo')).toContainText('φανταστικά');
  await expect(page.getByTestId('account-wipe')).toHaveCount(0);
});
