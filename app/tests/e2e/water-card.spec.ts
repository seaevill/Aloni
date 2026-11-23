import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Χωράφι › «Νερό αυτή την εβδομάδα»: rain of the last 7 days, the need (ET0 × Kc) and the difference; unknown with the reason when ET0 or Kc is missing. Information only: never «water now».
test('Demo: the weekly water card shows rain, need and difference; the note says it is information only', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('water-card');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('water-rain')).toContainText('mm');
  await expect(card.getByTestId('water-need').first()).toContainText('mm');
  await expect(card.getByTestId('water-gap').first()).toContainText('mm');
  await expect(card.getByTestId('water-note')).toContainText('δεν λέει «ποτίστε τώρα»');
  await expect(card).not.toContainText(/ασφαλ/i);
  await card.getByTestId('water-kc-edit').first().click();
  await card.getByTestId('water-kc').fill('0,7');
  await card.getByTestId('water-kc-save').click();
  await expect(card.getByTestId('water-need').first()).toContainText('mm');
});

test('a real farm without stored weather: rain, need and difference say WHY they are unknown (never a zero)', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('water-card');
  await expect(card.getByTestId('water-rain')).toContainText('άγνωστο – λείπουν ημέρες βροχής');
  await expect(card.getByTestId('water-need').first()).toContainText('άγνωστο – ο καιρός μας δεν δίνει εξατμισοδιαπνοή');
  await expect(card.getByTestId('water-gap').first()).toContainText('άγνωστο');
});
