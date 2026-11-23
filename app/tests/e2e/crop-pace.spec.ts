import { expect, test } from './helpers/test';

// Φυτά › a crop: «Ρυθμός συγκομιδής» (the owner's own estimate ÷ days) and «Από τις καταγραφές σας» (his own harvests). Unknown without an estimate; nothing is a default.
test('harvest pace: unknown until the owner enters an estimate, then crates ÷ days from HIS numbers, kept after a reload; own-record numbers say how many records', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();

  await expect(page.getByTestId('pace-unknown')).toHaveText('άγνωστο – βάλτε εκτίμηση');
  await page.getByTestId('pace-edit').click();
  await page.getByTestId('pace-crates').fill('54');
  await page.getByTestId('pace-end').fill('2026-11-23');
  await expect(page.getByTestId('pace-error')).toBeVisible();                     // not a future day
  await expect(page.getByTestId('pace-save')).toBeDisabled();
  await page.getByTestId('pace-end').fill('2026-12-11');
  await page.getByTestId('pace-save').click();
  await expect(page.getByTestId('pace-left')).toHaveText('Υπολείπονται 54 κλούβες σε 18 ημέρες');
  await expect(page.getByTestId('pace-rate')).toContainText('≈ 3 κλούβες/ημέρα');
  await expect(page.getByTestId('pace-source')).toHaveText('Πηγή: δική σας εκτίμηση');
  await page.reload();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();
  await expect(page.getByTestId('pace-rate')).toContainText('≈ 3 κλούβες/ημέρα');

  // own records: the numbers always say how many records stand behind them (or that there are too few); nothing «safe», nothing advised
  const own = page.getByTestId('crop-own');
  await expect(own).toBeVisible();
  await expect(own).toContainText(/καταγραφ/);
  await expect(page.getByTestId('crop-pace-wrap')).not.toContainText(/ασφαλ/i);
});
