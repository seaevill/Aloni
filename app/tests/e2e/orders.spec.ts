import { expect, test } from '@playwright/test';
import { athensDateTime, TEST_NOW } from '../helpers/clock';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

const file = (data: object, app = 'klouves') => ({ name: 'klouves-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app, at: TEST_NOW, data })) });
const today = athensDateTime(Date.parse(TEST_NOW)).slice(0, 10);

test('Κλούβες backup: loaded by hand, crates per crop this week, an unknown product is not counted, a wrong file is refused', async ({ page }) => {
  await fixClock(page);
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-orders').click();
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  await page.getByTestId('orders-file').setInputFiles(file({}, 'other'));
  await expect(page.getByTestId('orders-bad')).toBeVisible();
  const cfg = { products: [{ id: 'p1', name: 'Σπανάκι' }, { id: 'p2', name: 'Κάτι άγνωστο' }], clients: [] };
  await page.getByTestId('orders-file').setInputFiles(file({ 'klv.db.cfg': cfg, [`klv.db.day.${today}`]: { orders: { c1: { p1: 2.5, p2: 3 }, c2: { p1: 0.25 }, c3: { p1: 0.3 } } } }));
  await expect(page.getByTestId('orders-bad')).toHaveCount(0);
  await expect(page.getByTestId('orders-spinach-week')).toContainText('2,75');
  await expect(page.getByTestId('orders-skipped')).toBeVisible();
  await expect(page.getByTestId('orders-unmapped')).toBeVisible();
  await expect(page.getByTestId('orders-spinach-free')).toBeVisible();
  await page.getByTestId('orders-map').locator('summary').click();           // the matching is folded away
  await page.getByTestId('orders-map-p2').selectOption('rocket');           // the owner maps it by hand
  await expect(page.getByTestId('orders-rocket-week')).toContainText('3');
  await page.reload();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-orders').click();
  await expect(page.getByTestId('orders-rocket-week')).toContainText('3');   // kept on the phone
  expect(errors).toEqual([]);
});
