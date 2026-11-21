import { expect, test } from '@playwright/test';
import { athensDateTime, TEST_NOW } from '../helpers/clock';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

const today = athensDateTime(Date.parse(TEST_NOW)).slice(0, 10);
const real = { name: 'klouves-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'klouves', at: TEST_NOW, data: {
  'klv.db.cfg': { products: [{ id: 'p1', name: 'Σπανάκι' }, { id: 'p2', name: 'ΜόνοΣτοΠραγματικό' }], clients: [] }, [`klv.db.day.${today}`]: { orders: { c1: { p1: 21, p2: 3 } } } } })) };

test('an import in «Το κτήμα μου» is not visible in the demo farm, and the demo has its own fictional orders', async ({ page }) => {
  await fixClock(page);
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-orders').click();
  await page.getByTestId('orders-file').setInputFiles(real);
  await page.getByTestId('orders-map').locator('summary').click();
  await expect(page.getByTestId('orders-map-p2')).toBeVisible();
  await page.getByRole('button', { name: /Επιστροφή/ }).first().click();
  await page.getByRole('button', { name: 'Φόρτωση επίδειξης' }).click();
  await page.getByRole('button', { name: 'Κτήμα επίδειξης' }).click();
  await page.getByTestId('open-orders').click();
  await page.getByTestId('orders-map').locator('summary').click();
  await expect(page.getByTestId('orders-map-d-sp')).toBeVisible();                 // the demo's own fictional sample
  await expect(page.getByTestId('orders-map-p2')).toHaveCount(0);                  // nothing of the real import
  await page.getByRole('button', { name: /Επιστροφή/ }).first().click();
  await page.getByRole('button', { name: 'Το κτήμα μου' }).click();
  await page.getByTestId('open-orders').click();
  await page.getByTestId('orders-map').locator('summary').click();
  await expect(page.getByTestId('orders-map-p2')).toBeVisible();                   // back: the real one again
  await expect(page.getByTestId('orders-map-d-sp')).toHaveCount(0);
  expect(errors).toEqual([]);
});
