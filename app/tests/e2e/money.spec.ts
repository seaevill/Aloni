import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

// F1 «Ταμείο» (docs/milestones/F1.md). Demo farm, fixed clock (Europe/Athens 2026-11-16). Demo: income 480 + 210, expenses 185 + 62,40 + 150 → net 292,60 €.
test('Άλλα → Ταμείο: add, refuse an ambiguous amount, correct, cancel and undo; nothing is removed', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-money').click();
  await expect(page.getByTestId('money-notbooks')).toContainText('όχι λογιστικά βιβλία');
  await expect(page.getByTestId('money-local')).toContainText('μόνο σε αυτό το τηλέφωνο');
  const net = page.getByTestId('money-total').locator('.ds-bignum-value');
  await expect(net).toHaveText('292,60 €');

  await page.getByTestId('money-add-out').click();
  await page.getByTestId('money-amount').fill('1.000');
  await page.getByTestId('money-cat-fuel').click();
  await page.getByTestId('money-save').click();
  await expect(page.getByTestId('money-error')).toContainText('1.000');            // «1.000» could be read two ways: refused, never guessed
  await page.getByTestId('money-amount').fill('45,50');
  await page.getByTestId('money-save').click();
  await expect(net).toHaveText('247,10 €');
  await expect(page.getByTestId('money-out')).toContainText('442,90');

  await page.getByTestId('money-entry').filter({ hasText: '45,50' }).click();
  await page.getByTestId('money-correct').click();
  await expect(page.getByTestId('money-amount')).toHaveValue('45,50');
  await page.getByTestId('money-amount').fill('40');
  await page.getByTestId('money-save').click();
  await expect(net).toHaveText('252,60 €');
  await page.getByTestId('money-entry').filter({ hasText: '40,00' }).click();
  await expect(page.getByTestId('money-history-line')).toHaveCount(2);           // the old amount stays in the history

  await page.getByTestId('money-cancel').click();
  await expect(net).toHaveText('292,60 €');
  await page.getByTestId('toast').getByRole('button', { name: 'Αναίρεση' }).click();
  await expect(net).toHaveText('252,60 €');
  await expect(page.getByTestId('money-month')).toHaveCount(2);                   // October and November
});
