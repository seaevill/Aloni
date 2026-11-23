import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, closeHistory } from './helpers/farm';

const SHOTS = '../docs/design/screenshots-2026-11-23';
// One parcel history from the records that exist: sowing, fertilising, irrigation (with its m³ per στρέμμα), an observation and a harvest – newest first, Athens time.
test('the parcel history lists sowing, fertilising, irrigation, an observation and a harvest from the stored records, and the recorded water is 7 m³/στρ. on 0,5 στρ.', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await closeHistory(page);
  await page.getByTestId('quick-open').click();
  await page.getByTestId('quick-observe').click();
  await page.getByRole('button', { name: 'Κάτω Κάμπος' }).click();
  await page.getByTestId('kind-pest').click();
  await page.getByTestId('observation-form').locator('input.input').first().fill('κηλίδες στα φύλλα');
  await page.getByTestId('observe-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('harvest-open').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-crates').fill('4');
  await page.getByTestId('harvest-cutby-option').first().click();
  await page.getByTestId('harvest-save').click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('fieldwork');
  await card.getByTestId('work-add-fertilise').click();
  await card.getByTestId('work-nform').fill('ουρία');
  await card.getByTestId('work-nkg').fill('4,5');
  await card.getByTestId('work-save').click();
  await card.getByTestId('work-add-irrigate').click();
  await card.getByTestId('work-m3').fill('3,5');
  await card.getByTestId('work-save').click();
  await expect(card.getByTestId('work-item')).toHaveCount(2);
  const lines = page.getByTestId('timeline').locator('> *');
  await expect(page.getByTestId('timeline')).toContainText('Σπορά: Σπανάκι');
  await expect(page.getByTestId('timeline')).toContainText('Λίπανση: ουρία · 4,5 kg N/στρ.');
  await expect(page.getByTestId('timeline')).toContainText('Άρδευση · 3,5 m³');
  await expect(page.getByTestId('timeline')).toContainText('Παρατήρηση: Εχθρός · κηλίδες στα φύλλα');
  await expect(page.getByTestId('timeline')).toContainText('Συγκομιδή: Σπανάκι · 4 κλούβες');
  expect(await lines.count()).toBe(5);                                              // five events, none twice
  await expect(page.getByTestId('water-recorded')).toContainText('Καταγεγραμμένη άρδευση: 7 m³/στρ.');  // 3,5 m³ ÷ 0,5 στρ.
  await expect(page.getByTestId('water-recorded')).toContainText('δεν είναι η συνολική κατανάλωση νερού');   // recorded, never «total use»
  await expect(page.getByTestId('water-local')).toContainText('μόνο σε αυτό το τηλέφωνο');         // the phone-only warning stays
  await page.getByTestId('timeline').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/parcel-history-timeline.png` });
  expect(errors).toEqual([]);
});
