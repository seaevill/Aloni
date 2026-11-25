import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// SQL 0042 (confirmed on the readiness card): the ΚΑΕΚ is a column of the parcel row; every change needs a REASON (edit history); the «only on this phone» line is gone. Before the confirmation: unchanged (kaek.spec).
test('after the 0042 confirmation: saving the ΚΑΕΚ asks for a reason, then it is on the parcel row and queued; removing asks again', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0042' } }); tx.oncomplete = () => ok(); }; }));
  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('kaek-card');
  await expect(card.getByTestId('kaek-local')).toHaveCount(0);
  await card.getByTestId('kaek-edit').click();
  await card.getByTestId('kaek-input').fill('111111111111');
  await card.getByTestId('kaek-save').click();
  await expect(card.getByTestId('kaek-reason-error')).toBeVisible();              // no reason, nothing saved
  await expect(card.getByTestId('kaek-value')).toHaveCount(0);
  await card.getByTestId('kaek-reason').fill('από το κτηματολόγιο');
  await card.getByTestId('kaek-save').click();
  await expect(card.getByTestId('kaek-value')).toHaveText('111111111111');
  const row = await page.evaluate(() => new Promise<Record<string, unknown>>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('parcels').objectStore('parcels').getAll(); q.onsuccess = () => res((q.result as Array<Record<string, unknown>>)[0]!); }; }));
  expect(row).toMatchObject({ kaek: '111111111111', edit_reason: 'από το κτηματολόγιο' });
  await card.getByTestId('kaek-edit').click();
  await card.getByTestId('kaek-reason').fill('λάθος αριθμός');
  await card.getByTestId('kaek-remove').click();
  await expect(card.getByTestId('kaek-none')).toBeVisible();
});
