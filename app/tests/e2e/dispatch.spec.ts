import { expect, test } from './helpers/test';
import { athensDateTime, DAY_MS, TEST_NOW } from '../helpers/clock';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

// T10: the dispatch list per client for tomorrow, and the copy text (clipboard) in the agreed Greek form.
const tomorrow = athensDateTime(Date.parse(TEST_NOW) + DAY_MS).slice(0, 10);
const data = { 'klv.db.cfg': { products: [{ id: 'sp', name: 'Σπανάκι' }, { id: 'ro', name: 'Ρόκα' }], clients: [{ id: 'c1', name: 'Λαϊκή Νίκαιας' }, { id: 'c2', name: 'Μανάβικο Νίκος' }] },
  [`klv.db.day.${tomorrow}`]: { orders: { c1: { sp: 6, ro: 4.5 }, c2: { sp: 3 } } } };

test('dispatch tomorrow: one card per client, quarters as ½, copy puts the text on the clipboard', async ({ page }) => {
  // no share sheet and a recording clipboard (WebKit has no clipboard permission to grant): the app's own «share, then clipboard» path is what is tested
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => { (window as unknown as { __copied: string }).__copied = t; } }, configurable: true });
  });
  await fixClock(page);
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-orders').click();
  await page.getByTestId('orders-file').setInputFiles({ name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'klouves', at: TEST_NOW, data })) });
  await page.getByTestId('dispatch-tomorrow').click();
  await expect(page.getByTestId('dispatch-client')).toHaveCount(2);
  await expect(page.getByTestId('dispatch-client').first()).toContainText('Ρόκα: 4½');
  await page.getByTestId('dispatch-copy').click();
  await expect(page.getByTestId('dispatch-copied')).toBeVisible();
  const text = await page.evaluate(() => (window as unknown as { __copied: string }).__copied);
  expect(text).toContain('– αποστολή\nΛαϊκή Νίκαιας: Σπανάκι 6 · Ρόκα 4½\nΜανάβικο Νίκος: Σπανάκι 3\n= 13½ κλούβες');
  await page.getByTestId('dispatch-today').click();
  await expect(page.getByTestId('dispatch-none')).toBeVisible();
  expect(errors).toEqual([]);
});
