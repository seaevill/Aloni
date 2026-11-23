import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// D13: the share card. Owner only; a preview of one 1080 x 1350 PNG made on the phone; the share sheet or a download; no network request at all; the handle is optional and off by default.
test('owner: share icon on Σήμερα -> preview (1080 x 1350) -> download fallback; nothing leaves the phone', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => { if (!/^(blob:|data:)/.test(r.url()) && !r.url().startsWith('http://localhost:4173')) requests.push(r.url()); });
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  expect((await page.getByTestId('share-open').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await page.getByTestId('share-open').click();
  await expect(page.getByTestId('share-card')).toBeVisible();
  await expect(page.getByTestId('share-privacy')).toContainText('δεν έχει ονόματα εργατών ή χωραφιών');
  const img = page.getByTestId('share-preview');
  await expect(img).toBeVisible();
  expect(await img.evaluate((e: HTMLImageElement) => [e.naturalWidth, e.naturalHeight])).toEqual([1080, 1350]);
  await expect(page.getByTestId('share-handle')).toHaveValue('');                       // off by default
  const download = page.waitForEvent('download');
  await page.getByTestId('share-send').click();
  expect((await download).suggestedFilename()).toBe('aloni.png');
  await page.getByTestId('share-close').click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  expect(requests).toEqual([]);                                                          // no network call
  expect(errors).toEqual([]);
});

test('the optional handle line is kept on this phone only and the picture is redrawn with it', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.getByTestId('share-open').click();
  const first = await page.getByTestId('share-preview').getAttribute('src');
  await page.getByTestId('share-handle').fill('@bora.farm');
  await expect.poll(async () => page.getByTestId('share-preview').getAttribute('src')).not.toBe(first);
  expect(await page.evaluate(() => localStorage.getItem('share_handle'))).toBe('@bora.farm');
});

test('the worker view has no share button; a farm with nothing yet has none either', async ({ page }) => {
  await iphone(page);
  await expect(page.getByTestId('share-open')).toHaveCount(0);                          // empty farm: nothing to show
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.getByTestId('share-open')).toHaveCount(0);
});
