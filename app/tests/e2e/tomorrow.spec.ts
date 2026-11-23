import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// T8b «Αύριο φεύγουν» on Σήμερα: tomorrow's orders (crop × crates) next to what is cut today; missing / covered / surplus said plainly. Information only.
test('the demo farm shows tomorrow\'s fictional orders with one status chip per crop; a real farm without an import says so', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();                    // the demo farm
  const board = page.getByTestId('tomorrow');
  await expect(board).toBeVisible();
  await expect(board.getByRole('heading', { name: 'Αύριο φεύγουν' })).toBeVisible();
  const rows = board.getByTestId('tomorrow-row');
  expect(await rows.count()).toBeGreaterThan(0);
  const first = rows.first();
  await expect(first.getByTestId('tomorrow-ordered')).toContainText(/\d/);
  await expect(first.getByTestId('tomorrow-chip')).toHaveCount(1);                           // ONE chip: missing, covered or surplus
  await expect(first.getByTestId('tomorrow-chip')).toContainText(/Λείπουν|Περισσεύουν|Καλύπτεται/);
  await expect(first.getByTestId('tomorrow-supply')).toContainText('σε αναμονή');             // held plantings are shown apart and said not to count
  await expect(first.getByTestId('tomorrow-supply')).toContainText('δεν μετρούν');
});

test('a real farm with no Κλούβες import is told how to load it (nothing is invented)', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').first().click();                   // «add a parcel» opens the form: back out to a real farm with one parcel
  await page.locator('main input.input').nth(0).fill('Κάτω Κάμπος'); await page.locator('main input.input').nth(1).fill('0,5');
  await page.getByTestId('parcel-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('tomorrow-noimport')).toBeVisible();
});
