import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// A local error log: an error is kept on the phone only; Info → «Αναφορά σφάλματος» copies a plain report with ids scrubbed; nothing is sent over the network.
test.use({ viewport: { width: 375, height: 812 } });

test('an app error is kept locally, shown in the report with ids scrubbed, never sent, and can be cleared', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (r) => { if (r.method() !== 'GET') posts.push(`${r.method()} ${r.url()}`); });
  await iphone(page);
  await page.evaluate(() => { setTimeout(() => { throw new Error('test boom 3fa85f64-5717-4562-b3fc-2c963f66afa6'); }, 0); });
  await page.waitForTimeout(600);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-info').click();
  const box = page.getByTestId('error-report');
  await expect(box.getByTestId('error-count')).toContainText('1 σφάλματα');
  await box.getByTestId('error-copy').click();
  const text = await box.getByTestId('error-text').inputValue();
  expect(text).toContain('test boom'); expect(text).toContain('<id>'); expect(text).not.toContain('3fa85f64');
  expect(text).toContain('version:');
  expect(text).not.toMatch(/parcel|farm|customer|worker/i);                         // nothing about the farm
  await box.getByTestId('error-clear').click();
  await expect(box.getByTestId('error-count')).toContainText('Δεν έχει καταγραφεί');
  expect(posts).toEqual([]);                                                            // nothing left the phone
  expect((await box.getByTestId('error-copy').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
