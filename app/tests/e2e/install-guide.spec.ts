import { expect, test } from './helpers/test';

// iPhone install guide: on iPhone Safari (not yet on the Home Screen) Σήμερα offers «Προσθήκη στην αρχική οθόνη» — five steps with pictures and the warning that Safari and the Home Screen app keep SEPARATE data.
// It is not shown on other phones or inside the installed app.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
test.use({ viewport: { width: 375, height: 812 }, userAgent: IPHONE, hasTouch: true });

test('Safari on iPhone: the card opens a five-step guide with the separate-data warning', async ({ page }) => {
  await page.goto('/');
  const open = page.getByTestId('install-open');
  await expect(open).toBeVisible();
  expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await open.click();
  const sheet = page.getByTestId('sheet-install');
  await expect(sheet.locator('ol.ds-steps li')).toHaveCount(5);
  await expect(sheet.locator('ol.ds-steps li svg')).toHaveCount(5);                      // every step has its picture
  await expect(sheet.locator('ol.ds-steps')).toContainText('Κοινοποίηση');
  await expect(sheet.locator('ol.ds-steps')).toContainText('Προσθήκη στην αρχική οθόνη');
  await expect(sheet.getByTestId('install-warning')).toContainText('ΞΕΧΩΡΙΣΤΑ δεδομένα');   // the data of Safari and of the Home Screen app are separate
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/install/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
});

test('inside the installed app the card is not shown', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }); });
  await page.goto('/');
  await expect(page.locator('nav.tabs')).toBeVisible();
  await expect(page.getByTestId('install-open')).toHaveCount(0);
});

test.describe('other phones', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36' });
  test('an Android phone does not get the iPhone guide', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.tabs')).toBeVisible();
    await expect(page.getByTestId('install-open')).toHaveCount(0);
  });
});
