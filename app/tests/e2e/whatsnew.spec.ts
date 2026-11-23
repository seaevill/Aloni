import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// «Τι νέο»: the release notes open from their address: the newest release first, exactly three plain lines each.
test.use({ viewport: { width: 375, height: 812 } });
test('the release notes sheet shows three lines per release and closes', async ({ page }) => {
  await iphone(page);
  await page.evaluate(() => { location.hash = '#/own/today/sheet/whatsnew/all'; });
  const sheet = page.getByTestId('sheet-whatsnew');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Τι νέο');
  const first = sheet.getByTestId('release').first();
  await expect(first.locator('li')).toHaveCount(3);
  await expect(first).toContainText('καμπανάκι');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
});
