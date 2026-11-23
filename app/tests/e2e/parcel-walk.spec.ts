import { expect, test } from '@playwright/test';

test('walking an offline parcel rejects an overlapping fix and preserves the typed area', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const fixes = [[23.35, 38, 2], [23.350001, 38, 9], [23.351, 38, 2], [23.351, 38.001, 2]];
    navigator.geolocation.getCurrentPosition = (success) => {
      const [longitude, latitude, accuracy] = fixes.shift()!;
      success({ coords: { longitude, latitude, accuracy }, timestamp: Date.now() } as GeolocationPosition);
    };
  });
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('empty-state').locator('button').first().click();
  await page.getByRole('textbox').first().fill('GPS test');
  const area = page.locator('input[inputmode="decimal"]');
  await area.fill('2,5');
  await page.context().setOffline(true);
  await page.getByTestId('parcel-walk-open').click();
  const add = page.getByTestId('parcel-walk-point');
  await add.click();
  await expect(page.getByTestId('parcel-walk-reading')).toContainText('±2');
  await add.click();
  await expect(page.getByTestId('parcel-walk-rejected')).toBeVisible();
  await expect(page.getByTestId('parcel-walk-use')).toBeDisabled();
  await add.click();
  await add.click();
  await expect(page.getByTestId('parcel-walk-area')).not.toContainText('άγνωστο');
  const evidence = process.env.N23_GPS_EVIDENCE;
  if (evidence) await page.screenshot({ path: evidence, animations: 'disabled' });
  await page.getByTestId('parcel-walk-use').click();
  await expect(page.getByTestId('parcel-boundary-set')).toBeVisible();
  await expect(area).toHaveValue('2,5');
  await page.getByTestId('parcel-save').click();
  await expect(page.getByTestId('parcel-open').filter({ hasText: 'GPS test' })).toBeVisible();
  const saved = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const open = indexedDB.open('aloni');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const request = open.result.transaction('parcels').objectStore('parcels').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result.find((row) => row.name === 'GPS test'));
        open.result.close();
      };
    };
  }));
  expect(saved).toMatchObject({
    boundary: { type: 'Polygon', coordinates: [[[23.35, 38], [23.351, 38], [23.351, 38.001], [23.35, 38]]] },
  });
});
