import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

// Queue item 8c: right after a save the first screen said «Αποθηκεύτηκε στο τηλέφωνο…» TWICE (the global chip and the line under the confirmation). The line under the confirmation stays (it is the proof of WHERE the record is); the chip is quiet while it is on screen and comes back after.
const ON_PHONE = 'Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.';
test('the «saved on the phone» sentence appears once while the confirmation is on screen, and the chip is back afterwards', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observe-save').click();
  await expect(page.getByTestId('observe-saved-where')).toHaveText(ON_PHONE);
  await expect(page.getByText(ON_PHONE)).toHaveCount(1);
  await expect(page.getByTestId('sync-chip')).toHaveCount(0);
  await page.locator('nav.tabs [data-tab="crops"]').click();                      // the confirmation is gone…
  await expect(page.getByTestId('sync-chip')).toHaveText(ON_PHONE);               // …and the chip tells it again
});
