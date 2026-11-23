import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// D11: Σήμερα order and numbers. First screen (375 x 812): the urgent hero, the weather, the two numbers and both big buttons; nothing hides under the tab bar; the numbers come from records only.
test.use({ viewport: { width: 375, height: 812 } });

test('demo: hero, weather and both numbers are in the first screen; the two big numbers; held and unknown are named, never added', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-numbers')).toBeVisible();
  const tabBar = (await page.locator('nav.tabs').boundingBox())!.y;
  for (const id of ['urgent', 'today-numbers', 'spray-open', 'harvest-open']) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b!.y + b!.height, `${id} is under the tab bar or off the first screen`).toBeLessThanOrEqual(tabBar);
  }
  const order = await page.evaluate(() => ['urgent', 'today-numbers', 'spray-open', 'cut-today'].map((id) => document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect().top));
  expect([...order].sort((a, b) => a - b)).toEqual(order);                              // hero, numbers, buttons, then the cut list
  const nums = page.locator('[data-testid="today-numbers"] .ds-bignum');
  await expect(nums).toHaveCount(2);
  await expect(nums.nth(0).locator('.ds-bignum-caption')).toHaveText('Για κοπή σήμερα');
  await expect(nums.nth(1).locator('.ds-bignum-caption')).toHaveText('Κλούβες 7 ημ.');
  await expect(page.getByTestId('today-cut7-big').locator('figcaption')).toContainText('καταγράφηκαν');
  expect(errors).toEqual([]);
});

test('real farm with nothing logged: the 7-day number says «άγνωστο», not 0; the cut number is an exact count', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  const cut7 = page.getByTestId('today-cut7-big').locator('.ds-bignum-value');
  await expect(cut7).toHaveText('άγνωστο');
  await expect(page.locator('[data-testid="today-numbers"] .ds-bignum-value').first()).toContainText(/^\d+/);
});
