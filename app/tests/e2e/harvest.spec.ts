import { expect, test, type Page } from '@playwright/test';
import { setup, spray } from './helpers/farm';
import { iphone } from './helpers/iphone';

/** «YYYY-MM-DDTHH:mm» in the phone's clock, `days` from now. */
const at = (page: Page, days: number) => page.evaluate((n) => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + n * 86400000).toISOString().replace(/:\d{2}\.\d{3}Z$/, ''), days);

test('harvest counter: +1 buttons, nothing blocks a planting that was never sprayed', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  for (let i = 0; i < 3; i += 1) await page.getByTestId('harvest-more').click();
  await expect(page.getByTestId('harvest-crates')).toHaveValue('3');
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved')).toBeVisible();
  await expect(page.getByTestId('harvest')).toContainText('3 κλούβες');
  expect(errors).toEqual([]);
});

const EIGHT_DAYS = 8 * 86400000;

test('after a SIGNED spray the harvest is blocked until the waiting period has run out by the CLOCK (a later typed time cannot step over it), with no override', async ({ page }) => {
  await page.clock.install();
  await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByTestId('harvest-crates').fill('5');
  await expect(page.getByTestId('harvest-blocked')).toContainText('Σε αναμονή μέχρι');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.locator('input[type=datetime-local]').fill(await at(page, 6)); // still inside the 7 days
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.locator('input[type=datetime-local]').fill(await at(page, 8)); // a time after it: the gate still looks at NOW
  await expect(page.getByTestId('harvest-blocked')).toContainText('Σε αναμονή μέχρι');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.clock.setSystemTime(Date.now() + EIGHT_DAYS); // the 7 days really pass
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByTestId('harvest-crates').fill('5');
  await expect(page.getByTestId('harvest-blocked')).toHaveCount(0);
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest')).toContainText('5 κλούβες');
});

test('after an UNSIGNED spray the PHI is unknown: blocked even far in the future, until Bora enters it from the label and it runs out', async ({ page }) => {
  await page.clock.install();
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.locator('input[type=datetime-local]').fill(await at(page, 3650));
  await expect(page.getByTestId('harvest-blocked')).toContainText('άγνωστη αναμονή');
  await expect(page.getByTestId('harvest-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.getByTestId('wait-open').click();
  await page.getByTestId('wait-phi').fill('7'); await page.getByTestId('wait-rei').fill('24');
  await page.getByTestId('wait-save').click();
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await expect(page.getByTestId('harvest-blocked')).toContainText('Σε αναμονή μέχρι'); // his value does not unblock by itself
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.clock.setSystemTime(Date.now() + EIGHT_DAYS);
  await page.getByTestId('harvest-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByTestId('harvest-crates').fill('2');
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest')).toContainText('2 κλούβες');
});
