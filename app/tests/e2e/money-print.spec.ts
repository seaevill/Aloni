import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

// F3 «Ταμείο» PDF for the accountant. Demo farm, fixed clock (Europe/Athens 2026-11-16): income 480 + 210, expenses 185 + 62,40 + 150 → net 292,60 €.
test('Ταμείο: the print button opens the print action and the printed page is Greek, unsigned, with every counted row and the year totals', async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printRequested = 'yes'; }; });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-money').click();
  const draft = page.getByTestId('money-print-page');
  await expect(draft).toBeHidden();                                              // not on the phone screen
  await page.getByTestId('money-print').click();
  await expect(page.locator('html')).toHaveAttribute('data-print-requested', 'yes');
  await page.emulateMedia({ media: 'print' });
  await expect(draft).toBeVisible();
  await expect(draft).toHaveAttribute('lang', 'el');
  await expect(draft).toContainText('όχι λογιστικά βιβλία');
  await expect(draft.getByTestId('money-print-row')).toHaveCount(5);
  await expect(draft.getByTestId('money-print-totals')).toContainText('690,00 €');
  await expect(draft.getByTestId('money-print-totals')).toContainText('397,40 €');
  await expect(draft.getByTestId('money-print-totals')).toContainText('292,60 €');
  expect((await draft.getByTestId('money-print-amount').allTextContents()).sort()).toEqual(['150,00', '185,00', '210,00', '480,00', '62,40']);
  await expect(page.getByTestId('money-total')).toBeHidden();                   // the rest of the screen is not printed
  await expect(page.getByTestId('money-print')).toBeHidden();
});
