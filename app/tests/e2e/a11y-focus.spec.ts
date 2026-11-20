import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T20: a screen opened from a list takes the focus on its heading and gives it back on Back; the toast container exists before any toast; Escape closes the photo viewer.
test('Άλλα → Εργάτες: the heading has the focus, and Back returns it to the opener row', async ({ page }) => {
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.getByTestId('toast-live')).toHaveCount(1);          // the live region exists before any toast
  await page.getByTestId('open-workers').focus();
  await page.getByTestId('open-workers').click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
  await page.locator('.topbar .back').click();
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.testid)).toBe('open-workers');
  expect(errors).toEqual([]);
});

test('worker heading takes focus before paint so it cannot interrupt typing', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  const focusedBeforePaint = await page.getByTestId('open-workers').evaluate(async (opener: HTMLButtonElement) => {
    opener.click();
    // Preact renders in a microtask. Check within the same frame, before passive effects run.
    await Promise.resolve();
    return document.activeElement === document.querySelector('main h1');
  });
  expect(focusedBeforePaint).toBe(true);
  await page.getByTestId('worker-name').fill('Γιώργος');
  await page.getByTestId('worker-add').click();
  await expect(page.getByTestId('worker')).toContainText('Γιώργος');
});

test('the photo viewer is a labelled dialog and Escape closes it', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-photos').click();
  const png = await page.evaluate(() => { const k = document.createElement('canvas'); k.width = 40; k.height = 30; k.getContext('2d')!.fillRect(0, 0, 40, 30); return k.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByTestId('photo')).toHaveCount(1);
  await page.getByTestId('photo').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('aria-label', /Φωτογραφία 1 από 1/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('photo-viewer')).toHaveCount(0);
});
