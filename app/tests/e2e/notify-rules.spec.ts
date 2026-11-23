import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('Ειδοποιήσεις: all 16 rules are unsigned – listed as information only, none may notify', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  const items = page.locator('[data-testid^="rule-"]');
  await expect(items).toHaveCount(16);
  for (const li of await items.all()) await expect(li).toHaveAttribute('data-notice', 'unsigned');
  expect(errors).toEqual([]);
});
