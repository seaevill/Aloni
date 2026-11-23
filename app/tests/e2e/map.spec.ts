import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// The parcel map at 375 px. The base map itself comes from the internet, so the style is a tiny local stub. A browser without WebGL (some CI machines) shows a plain message instead of a map:
// the test accepts that, because what matters is that the screen opens, says where the map comes from, never replaces the typed area, and goes back.
test('parcel map: opens from the parcel form, names its source, keeps the typed area, no sideways scroll, goes back', async ({ page }) => {
  await page.route('**/styles/liberty', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dde8d6' } }] }) }));
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').click();
  await page.locator('input.input').nth(0).fill('Κάτω Κάμπος');
  await page.locator('input.input').nth(1).fill('10');
  await page.getByTestId('parcel-map-open').click();
  await expect(page.getByTestId('parcel-map')).toBeVisible();
  await expect(page.getByText('OpenFreeMap')).toBeVisible();                       // the source is named (attribution)
  await expect(page.getByTestId('map-area')).toContainText('Δεν υπάρχει ακόμα σχήμα');
  await expect(page.getByTestId('map-area')).toContainText('δεν αλλάζει ποτέ');      // the typed area is never replaced
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('map-cancel').click();
  await expect(page.getByTestId('parcel-save')).toBeVisible();                     // back on the form, typed values still there
  await expect(page.locator('input.input').nth(1)).toHaveValue('10');
  expect(errors.filter((e) => !/WebGL|webgl|tiles|Failed to load|net::/i.test(e))).toEqual([]);
});
