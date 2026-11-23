import { expect, test } from '@playwright/test';

// Φυτά › a planting › «Πρόγραμμα λίπανσης»: the agronomist's plan in HIS words (a day after sowing + his line); the app suggests nothing, reminders stay off. Kept on the phone.
test('the agronomist\'s line is kept exactly as written, with its day; reminders are off; the app proposes no fertiliser or quantity', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  const card = page.getByTestId('fert-plan').first();
  await expect(card.getByTestId('fert-none')).toBeVisible();
  await expect(card.getByTestId('fert-reminders')).toContainText('κλειστές');
  await expect(card.getByTestId('fert-note')).toHaveText('Η εφαρμογή δεν προτείνει λίπασμα ούτε ποσότητα.');
  await card.getByTestId('fert-add').click();
  await card.getByTestId('fert-day').fill('2.5');
  await card.getByTestId('fert-text').fill('Ουρία 20 kg/στρ.');
  await card.getByTestId('fert-save').click();
  await expect(card.getByTestId('fert-error')).toBeVisible();                       // not a whole number of days
  await card.getByTestId('fert-day').fill('20');
  await card.getByTestId('fert-save').click();
  const item = card.getByTestId('fert-item');
  await expect(item).toContainText('Ημέρα 20');
  await expect(item).toContainText('όπως το έγραψε ο γεωπόνος');
  await expect(item).toContainText('Ουρία 20 kg/στρ.');                            // his words, untouched
  await page.reload();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  await expect(page.getByTestId('fert-plan').first().getByTestId('fert-item')).toHaveCount(1);
  await expect(page.getByTestId('fert-plan').first()).not.toContainText(/ασφαλ/i);
  await page.getByTestId('fert-plan').first().getByTestId('fert-remove').click();
  await expect(page.getByTestId('fert-plan').first().getByTestId('fert-none')).toBeVisible();
});
