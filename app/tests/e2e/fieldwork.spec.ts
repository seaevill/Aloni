import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Χωράφι › «Λίπανση / Άρδευση»: RECORDS of what was done (typed by the owner). The N form is mandatory; a quantity that is not a number is refused; the weather of that day is shown only when it is known.
test('a fertilising and an irrigation record are kept with their day; the weather of that day says unknown when there is none; the app suggests nothing', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('fieldwork');
  await expect(card.getByTestId('work-none')).toBeVisible();
  await expect(card.getByTestId('work-local')).toContainText('μόνο σε αυτό το τηλέφωνο');
  await expect(card.getByTestId('work-note')).toContainText('δεν προτείνει λίπασμα');

  await card.getByTestId('work-add-fertilise').click();
  await card.getByTestId('work-save').click();
  await expect(card.getByTestId('work-error')).toBeVisible();                       // the N form is mandatory
  await card.getByTestId('work-nform').fill('ουρία');
  await card.getByTestId('work-nkg').fill('abc');
  await card.getByTestId('work-save').click();
  await expect(card.getByTestId('work-error')).toBeVisible();                       // not a number
  await card.getByTestId('work-nkg').fill('4,5');
  await card.getByTestId('work-save').click();
  const item = card.getByTestId('work-item');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Λίπανση');
  await expect(item).toContainText('Μορφή αζώτου: ουρία');
  await expect(item).toContainText('4,5 kg N/στρ.');                               // exactly as typed
  await expect(card.getByTestId('work-wx')).toHaveText('Καιρός εκείνη την ημέρα: άγνωστο');   // a real farm without stored weather

  await card.getByTestId('work-add-irrigate').click();
  await card.getByTestId('work-minutes').fill('90');
  await card.getByTestId('work-m3').fill('3,5');
  await card.getByTestId('work-save').click();
  await expect(card.getByTestId('work-item')).toHaveCount(2);
  await expect(card.getByTestId('work-item').filter({ hasText: 'Άρδευση' })).toContainText('90 λεπτά');
  await expect(card.getByTestId('work-item').filter({ hasText: 'Άρδευση' })).toContainText('3,5 m³');

  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('fieldwork').getByTestId('work-item')).toHaveCount(2);
  await expect(page.getByTestId('fieldwork')).not.toContainText(/ασφαλ/i);
  await page.getByTestId('fieldwork').getByTestId('work-remove').first().click();
  await expect(page.getByTestId('fieldwork').getByTestId('work-item')).toHaveCount(1);
});

test('Demo: the records can be tried, and the weather of the day is copied from the Demo weather', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('fieldwork');
  await card.getByTestId('work-add-irrigate').click();
  await card.getByTestId('work-day').fill('2026-11-23');
  await card.getByTestId('work-minutes').fill('45');
  await card.getByTestId('work-save').click();
  await expect(card.getByTestId('work-wx')).toContainText('°');                       // today's Demo weather was copied
});
