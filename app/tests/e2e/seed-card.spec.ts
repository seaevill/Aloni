import { expect, test } from './helpers/test';

// Φυτά › a crop › «Σπόρος»: the seed rate the grower writes × each planting's area; no rate = unknown; the app proposes no rate.
test('seed: unknown until the grower writes a rate, then rate × area per planting, exactly; a bad rate is refused', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Μαϊντανός' }).click();
  const card = page.getByTestId('seed-card');
  await expect(card.getByTestId('seed-rate')).toHaveText('Δεν έχει καταχωριστεί δόση σποράς.');
  await expect(card.getByTestId('seed-kg').first()).toContainText('άγνωστο – λείπει η δόση σποράς');
  await card.getByTestId('seed-edit').click();
  await card.getByTestId('seed-input').fill('abc');
  await card.getByTestId('seed-save').click();
  await expect(card.getByTestId('seed-error')).toBeVisible();
  await card.getByTestId('seed-input').fill('0,6');
  await card.getByTestId('seed-save').click();
  await expect(card.getByTestId('seed-rate')).toHaveText('Δόση σποράς που γράψατε: 0,6 kg/στρ.');
  await expect(card.getByTestId('seed-kg').first()).toContainText('kg σπόρου');
  await expect(card.getByTestId('seed-total')).toBeVisible();
  await expect(card.getByTestId('seed-note')).toContainText('δεν προτείνει δόση σποράς');
  await page.reload();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Μαϊντανός' }).click();
  await expect(page.getByTestId('seed-rate')).toHaveText('Δόση σποράς που γράψατε: 0,6 kg/στρ.');
  await expect(page.getByTestId('seed-card')).not.toContainText(/ασφαλ/i);
});
