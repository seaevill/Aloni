import { expect, test } from './helpers/test';

// Προϊόν › «Υπολογισμός ψεκαστικού»: the dose of a SIGNED label × the area, exactly; an unsigned or incomplete label gives no number; the grower types the water and the tank.
test('the Demo copper product: a signed label gives exact numbers, an unsigned one stays closed; tanks come from the grower\'s own water and tank numbers', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  await page.getByTestId('product-source-open').filter({ hasText: 'χαλκού' }).click();
  await page.getByTestId('product-calc').evaluate((el) => (el as HTMLElement).click());
  const sheet = page.getByTestId('spray-calc');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('scalc-note')).toContainText('δεν επιλέγει προϊόν, δόση ή νερό');

  const chips = sheet.getByTestId('scalc-crop');
  const n = await chips.count();
  expect(n).toBeGreaterThan(1);
  let closed = 0; let open = 0;
  await sheet.getByTestId('scalc-area').fill('2');
  await sheet.getByTestId('scalc-water').fill('80');
  await sheet.getByTestId('scalc-tank').fill('600');
  for (let i = 0; i < n; i += 1) {
    await chips.nth(i).evaluate((el) => (el as HTMLElement).click());
    if (await sheet.getByTestId('scalc-result').count() > 0) {
      open += 1;
      await expect(sheet.getByTestId('scalc-product').first()).toContainText(/\d/);
      await expect(sheet.getByTestId('scalc-water-total')).toContainText('160 l');                       // 2 στρ. × 80 l
      await expect(sheet.getByTestId('scalc-tanks')).toContainText('1');                                // 160 l in a 600 l tank
    } else {
      closed += 1;
      await expect(sheet.getByTestId('scalc-blocked')).toContainText('ο υπολογισμός μένει κλειστός');
    }
  }
  expect(open).toBeGreaterThan(0);                                                                       // a signed label of the Demo
  expect(closed).toBeGreaterThan(0);                                                                     // the unsigned example (PR01 on chard)
  await expect(sheet).not.toContainText(/ασφαλ/i);
});
