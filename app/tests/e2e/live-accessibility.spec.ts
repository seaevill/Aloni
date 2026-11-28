import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openSettings } from './helpers/tabs';

test('live-build email and code steps meet the axe gate at 375 px', async ({ page }) => {
  await page.route('**/mock/auth/v1/otp', (route) => route.fulfill({ json: {} }));
  await page.goto('/');
  await openSettings(page);
  const signIn = page.getByTestId('sign-in');
  await expect(signIn).toBeVisible();

  const check = async (step: string) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
    expect(serious.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })), step).toEqual([]);
  };

  await check('email');
  await signIn.locator('input').first().fill('worker@example.org');
  await page.getByTestId('signin-send').click();
  await expect(page.getByTestId('signin-verify')).toBeVisible();
  await check('code');
});
