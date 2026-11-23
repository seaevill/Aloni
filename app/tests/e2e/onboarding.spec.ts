import { expect, test } from './helpers/test';

// D9: owner first-run onboarding: three skippable cards, a local seen-flag only, then the normal screen. A farm that already has a field never sees it; the worker route never renders it.
test.use({ storageState: { cookies: [], origins: [] } });   // a brand-new phone

test('three cards, skip works on card 1, only a local flag is stored, then the normal welcome', async ({ page }) => {
  await page.goto('/');
  const ob = page.getByTestId('onboarding');
  await expect(ob).toBeVisible();
  await expect(ob).toHaveAttribute('data-step', '1');
  await expect(ob.locator('h1')).toHaveText('Το Αλώνι σου');
  await page.getByTestId('onboarding-next').click();
  await expect(ob).toHaveAttribute('data-step', '2');
  await expect(ob.locator('h1')).toHaveText('Κτήμα επίδειξης = φανταστικά στοιχεία');
  await page.getByTestId('onboarding-next').click();
  await expect(ob).toHaveAttribute('data-step', '3');
  await expect(ob.locator('h1')).toHaveText('Η εφαρμογή προτείνει· εσύ αποφασίζεις');
  await expect(page.getByTestId('onboarding-skip')).toHaveCount(0);               // the last card has «Ξεκινάμε» only
  for (const b of await page.locator('[data-testid="onboarding"] button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await page.getByTestId('onboarding-next').click();
  await expect(ob).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();                       // the existing «add a field» / demo choice
  expect(await page.evaluate(() => localStorage.getItem('onboarding_seen'))).toBe('1');
  await page.reload();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);                      // never again on this phone
});

test('skip on the first card ends it at once', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('onboarding-skip').click();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('a phone that already holds a field never sees it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('onboarding-skip').click();
  await page.getByTestId('empty-state').locator('button').nth(1).click();           // load the demo (a farm with fields)
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('onboarding_seen'));
  await page.reload();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
});

test('the worker view never shows the onboarding', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('onboarding-skip').click();
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('onboarding_seen'));
  await page.reload();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
});
