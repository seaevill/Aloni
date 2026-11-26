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

// Independent review 2026-11-25: one row per double tap, note hint + cap, no myDATA claim.
test('Ταμείο: a double tap on save writes one row, the note is capped and carries a hint, the page makes no myDATA claim', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-money').click();
  await expect(page.getByTestId('money-notbooks')).not.toContainText('myDATA');
  const net = page.getByTestId('money-total').locator('.ds-bignum-value');
  await expect(net).toHaveText('292,60 €');
  await page.getByTestId('money-add-out').click();
  await page.getByTestId('money-amount').fill('10');
  await page.getByTestId('money-cat-fuel').click();
  await expect(page.getByTestId('money-note')).toHaveAttribute('maxlength', '80');
  await expect(page.getByText('Μην γράφεις ονόματα ή τηλέφωνα.')).toBeVisible();
  await page.getByTestId('money-save').dblclick();
  await expect(net).toHaveText('282,60 €');                                          // 292,60 − 10,00 once, not twice
});

// Review SHOULD 3: a cancelled entry stays listed and can be restored after the toast is gone.
test('Ταμείο: a cancelled entry is listed under «Ακυρωμένες εγγραφές» and can be restored later', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-money').click();
  const net = page.getByTestId('money-total').locator('.ds-bignum-value');
  await expect(net).toHaveText('292,60 €');
  await expect(page.getByTestId('money-cancelled')).toHaveCount(0);
  await page.getByTestId('money-entry').first().click();
  await page.getByTestId('money-cancel').click();
  await expect(net).not.toHaveText('292,60 €');
  await page.waitForTimeout(6000);                                                   // the undo toast is gone
  await page.getByTestId('money-cancelled').locator('summary').click();
  await expect(page.getByTestId('money-cancelled-entry')).toHaveCount(1);
  await page.getByTestId('money-restore').click();
  await expect(net).toHaveText('292,60 €');
  await expect(page.getByTestId('money-cancelled')).toHaveCount(0);
});
