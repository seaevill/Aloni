import { expect, test } from './helpers/test';

// Φυτά › «Οδηγός καλλιέργειας»: literature ranges with the page they were read on, or «δεν υπάρχει πηγή»; always the «not signed» banner; no decision, nothing «safe».
test('the crop guide lists sourced ranges with links and says «no source» for the rest', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  await page.getByTestId('crop-guide-open').click();
  const sheet = page.getByTestId('crop-guide');
  await expect(sheet.getByTestId('guide-banner')).toContainText('χωρίς υπογραφή γεωπόνου');
  await expect(sheet.getByTestId('guide-ph').getByTestId('guide-range')).toHaveCount(2);                 // two sources that differ: both are listed
  await expect(sheet.getByTestId('guide-ph').locator('a').first()).toHaveAttribute('href', /^https:\/\//);
  await expect(sheet.getByTestId('guide-sow_to_cut').getByTestId('guide-none')).toHaveText('δεν υπάρχει πηγή');
  await expect(sheet.getByTestId('guide-cuts').getByTestId('guide-none')).toHaveText('δεν υπάρχει πηγή');
  await expect(sheet).not.toContainText(/ασφαλ/i);
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
});
