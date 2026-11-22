import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('the worker says where the crates went: two big tiles, a direct dispatch may name the receiver; the answer stays on the phone and never on the synced row', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-tab-harvest').click();
  await page.getByTestId('harvest-chip').filter({ hasText: 'Σπανάκι' }).first().click();
  await page.getByTestId('harvest-more').click();
  for (const id of ['harvest-dest-store', 'harvest-dest-dispatch']) {
    expect((await page.getByTestId(id).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  }
  await expect(page.getByTestId('harvest-recv-name')).toHaveCount(0);
  await page.getByTestId('harvest-dest-dispatch').click();
  await page.getByTestId('harvest-recv-name').fill('Δημήτρης');
  await page.getByTestId('harvest-recv-phone').fill('6922222222');
  const read = () => page.evaluate(() => new Promise<{ settings: unknown; rowsWithField: number }>((res) => {
    const r = indexedDB.open('aloni');
    r.onsuccess = () => {
      const tx = r.result.transaction(['settings', 'job_harvest']);
      const s = tx.objectStore('settings').getAll(); const h = tx.objectStore('job_harvest').getAll();
      tx.oncomplete = () => res({
        settings: (s.result as Array<{ key?: string; id?: string; value: unknown }>).filter((x) => String(x.key ?? x.id).startsWith('harvest_dest:')).map((x) => x.value),
        rowsWithField: (h.result as Array<Record<string, unknown>>).filter((x) => 'destination' in x || 'receiver_phone' in x).length,
      });
    };
  }));
  const before = (await read()).rowsWithField;       // the Demo's own fictional harvests already carry a destination
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest-saved-line')).toBeVisible();
  const saved = await read();
  expect(JSON.stringify(saved.settings)).toContain('6922222222');
  expect(JSON.stringify(saved.settings)).toContain('dispatch');
  expect(saved.rowsWithField).toBe(before);           // the new row carries no destination column
});
