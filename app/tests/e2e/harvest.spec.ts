import { expect, test } from './helpers/test';
import { setup, spray, openHistory, closeHistory } from './helpers/farm';
import { advanceDays, athensInput, fixClock } from './helpers/clock';
import { DAY_MS } from '../helpers/clock';
import { iphone } from './helpers/iphone';

// a safety test is never retried: a failure that comes and goes is a real race, not noise (see playwright.config.ts)
test.describe.configure({ retries: 0 });

test('harvest counter: +1 buttons, nothing blocks a planting that was never sprayed', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  for (let i = 0; i < 3; i += 1) await page.getByTestId('harvest-more').click();
  await expect(page.getByTestId('harvest-crates')).toHaveValue('3');
  await page.getByTestId('harvest-cutby-option').first().click();                       // «Ποιος έκοψε» is required
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await openHistory(page);
  await expect(page.getByTestId('harvest')).toContainText('3 κλούβες');
  expect(errors).toEqual([]);
});

test('after a SIGNED spray the harvest is blocked until the waiting period has run out by the CLOCK (a later typed time cannot step over it), with no override', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-crates').fill('5');
  await expect(page.getByTestId('harvest-blocked')).toContainText('Σε αναμονή μέχρι');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.locator('input[type=datetime-local]').fill(await athensInput(page, 6 * DAY_MS)); // still inside the 7 days
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.locator('input[type=datetime-local]').fill(await athensInput(page, 8 * DAY_MS)); // a time after it: the gate still looks at NOW
  await expect(page.getByTestId('harvest-blocked')).toContainText('Σε αναμονή μέχρι');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await advanceDays(page, 8); // the 7 days really pass
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-crates').fill('5');
  await expect(page.getByTestId('harvest-blocked')).toHaveCount(0);
  await page.getByTestId('harvest-cutby-option').first().click();                       // «Ποιος έκοψε» is required
  await page.getByTestId('harvest-save').click();
  await openHistory(page);
  await expect(page.getByTestId('harvest')).toContainText('5 κλούβες');
});

test('after an UNSIGNED spray the PHI is unknown: blocked even far in the future, and his typed value does not open it while the label is unsigned', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.locator('input[type=datetime-local]').fill(await athensInput(page, 3650 * DAY_MS));
  await expect(page.getByTestId('harvest-blocked')).toContainText('άγνωστη αναμονή');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await openHistory(page);
  await page.getByTestId('wait-open').click();
  await page.getByTestId('wait-phi').fill('7'); await page.getByTestId('wait-rei').fill('24'); await page.getByTestId('wait-reason').fill('τιμές από την ετικέτα');
  await page.getByTestId('wait-save').click();
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  // m9 S-NEW-1: his typed value never opens anything, and the label is still an UNSIGNED draft: the planting stays unknown = closed until the agronomist's signature exists
  await expect(page.getByTestId('harvest-blocked')).toContainText('άγνωστη αναμονή');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
});

test('«Ποιος έκοψε» is required: without a cutter nothing is saved and the screen says why; with one it is kept and shown', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-cutby-error')).toBeVisible();
  await expect(page.getByTestId('harvest-saved')).toHaveCount(0);
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await openHistory(page);
  await expect(page.getByTestId('harvest')).toContainText('Γιώργος');
  expect(errors).toEqual([]);
});
