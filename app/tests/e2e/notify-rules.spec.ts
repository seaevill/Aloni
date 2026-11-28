import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { openSettings } from './helpers/tabs';

test('Ειδοποιήσεις: all 16 rules are unsigned – listed as information only, none may notify', async ({ page }) => {
  const errors = await iphone(page);
  await openSettings(page);
  const items = page.locator('[data-testid^="rule-"]');
  await expect(items).toHaveCount(16);
  for (const li of await items.all()) await expect(li).toHaveAttribute('data-notice', 'unsigned');
  expect(errors).toEqual([]);
});
