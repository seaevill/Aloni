import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T11: a phone in Hindi starts in Hindi; a worker's language choice does not change the owner's language; the «your data» notice is shown once.
test.describe('Hindi phone', () => {
  test.use({ locale: 'hi-IN' });
  test('a fresh profile starts in Hindi', async ({ page }) => {
    await iphone(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi'); // the owner screens without a Hindi text fall back to Greek; the worker screens are Hindi
  });
});

test('worker view: own language, owner stays Greek, the data notice is shown once', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-data')).toHaveAttribute('open', '');
  await page.getByTestId('worker-data-ack').click();
  await expect(page.getByTestId('worker-data-ack')).toHaveCount(0);
  await page.getByTestId('worker-lang').getByRole('button', { name: 'हिन्दी' }).click();
  await expect(page.getByTestId('worker-data').locator('summary')).toHaveText('आपका डेटा');
  await page.getByTestId('worker-exit').click();
  await expect(page.locator('nav.tabs .lbl').first()).toHaveText('Σήμερα');      // the owner's screens are still Greek
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-data').locator('summary')).toHaveText('आपका डेटा'); // her own language is remembered on her phone
  await expect(page.getByTestId('worker-data')).not.toHaveAttribute('open', ''); // acknowledged once: folded
  expect(errors).toEqual([]);
});
