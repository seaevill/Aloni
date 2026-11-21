import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T18: the technical items live in a collapsed «Για προγραμματιστές» section at the bottom of Άλλα.
test('Άλλα: no migration / advisor wording until «Για προγραμματιστές» is opened; the one-line phone note is visible', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('this-phone')).toContainText('μόνο σε αυτό το τηλέφωνο');
  await expect(page.getByTestId('opened-from')).toContainText('Ανοιχτό από');
  await expect(page.getByTestId('ready-controller')).toBeVisible();
  for (const key of ['ready-migration', 'ready-advisor', 'ready-migration-confirm', 'ready-advisor-confirm']) await expect(page.getByTestId(key)).toBeHidden();
  expect(await page.getByText('0034').filter({ visible: true }).count()).toBe(0);
  await page.getByTestId('dev-section').locator('summary').click();
  await expect(page.getByTestId('ready-migration')).toBeVisible();
  await expect(page.getByTestId('ready-advisor')).toBeVisible();
  expect(errors).toEqual([]);
});
