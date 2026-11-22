import { expect, test } from '@playwright/test';
import { setup, spray } from './helpers/farm';
import { iphone } from './helpers/iphone';

// C10: Καλλιέργειες and Χωράφια cards show the last spraying and the waiting state FROM THE RECORDS (same rule as the harvest gate): signed label -> «Κοπή από …»; unsigned = unknown, never «free».
test('after a spraying with a SIGNED label the cards say «Κοπή από …» and show the last spraying; before it they say «χωρίς ψεκασμό»', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('parcel-wait').first()).toContainText('Χωρίς ψεκασμό');
  await page.locator('nav.tabs [data-tab="today"]').click();
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('parcel-wait').first()).toContainText('Τελευταίος ψεκασμός');
  await expect(page.getByTestId('parcel-wait').first()).toContainText('Κοπή από');
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await expect(page.getByTestId('crop-open').first().locator('.ds-chip')).toContainText('Σε αναμονή');      // the list says it in ONE chip
  await page.getByTestId('crop-open').first().click();
  await expect(page.getByTestId('planting-wait').first()).toContainText('Κοπή από');                       // the crop page keeps the full line
});

test('with an UNSIGNED label the waiting state is unknown on both cards (never free)', async ({ page }) => {
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await expect(page.getByTestId('parcel-wait').first()).toContainText('άγνωστο');
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await expect(page.getByTestId('crop-open').first().locator('.ds-chip')).toContainText('Άγνωστη αναμονή');   // never «ready»
  await page.getByTestId('crop-open').first().click();
  await expect(page.getByTestId('planting-wait').first()).toContainText('άγνωστο');
  await expect(page.getByTestId('planting-wait').first()).not.toContainText('δεν υπάρχει καταγεγραμμένη αναμονή');
});
