import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// T10: the dispatch list per client for tomorrow, and the copy text (clipboard) in the agreed Greek form.
const ATHENS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = (n: number): string => ATHENS.format(new Date(Date.now() + n * 86_400_000)); // the Athens calendar day, as the app reads it
const data = { 'klv.db.cfg': { products: [{ id: 'sp', name: 'Σπανάκι' }, { id: 'ro', name: 'Ρόκα' }], clients: [{ id: 'c1', name: 'Λαϊκή Νίκαιας' }, { id: 'c2', name: 'Μανάβικο Νίκος' }] },
  [`klv.db.day.${day(1)}`]: { orders: { c1: { sp: 6, ro: 4.5 }, c2: { sp: 3 } } } };

test('dispatch tomorrow: one card per client, quarters as ½, copy puts the text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); }); // no share sheet: the clipboard path
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-orders').click();
  await page.getByTestId('orders-file').setInputFiles({ name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'klouves', at: new Date().toISOString(), data })) });
  await page.getByTestId('dispatch-tomorrow').click();
  await expect(page.getByTestId('dispatch-client')).toHaveCount(2);
  await expect(page.getByTestId('dispatch-client').first()).toContainText('Ρόκα: 4½');
  await page.getByTestId('dispatch-copy').click();
  await expect(page.getByTestId('dispatch-copied')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('– αποστολή\nΛαϊκή Νίκαιας: Σπανάκι 6 · Ρόκα 4½\nΜανάβικο Νίκος: Σπανάκι 3\n= 13½ κλούβες');
  await page.getByTestId('dispatch-today').click();
  await expect(page.getByTestId('dispatch-none')).toBeVisible();
  expect(errors).toEqual([]);
});
