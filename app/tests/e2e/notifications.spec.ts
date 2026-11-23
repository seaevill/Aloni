import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('Ειδοποιήσεις: the quiet hours are kept (default 21:00–05:30), a wrong time is refused, and without a push key the switch says «not available yet» and requests nothing', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  const box = page.getByTestId('notifications');
  await expect(box.getByTestId('quiet-from')).toHaveValue('21:00');
  await expect(box.getByTestId('quiet-to')).toHaveValue('05:30');
  await box.getByTestId('quiet-from').fill('22:00');
  await expect(page.getByTestId('notify-saved')).toBeVisible();
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('quiet-from')).toHaveValue('22:00');          // kept after a reload
  await page.getByTestId('notify-toggle').click();
  await expect(page.getByTestId('notify-nokey')).toBeVisible();               // no VAPID key yet: nothing is asked of the browser
  await expect(page.getByTestId('notify-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
