import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

test.use({ viewport: { width: 375, height: 812 } });

// SQL 0041 is applied: once the owner confirms it (readiness «migration» ≥ 0041) the season target is a SERVER row (insert-only: a change is a new row, the newest wins) queued for sync, and the «only on this phone» line is gone. Before that nothing changes.
const confirm = (page: Page) => page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ key: 'readiness', value: { migration: '0041' } }); tx.oncomplete = () => ok(); }; }));
const all = <T,>(page: Page, store: string) => page.evaluate((s) => new Promise<T[]>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).getAll(); q.onsuccess = () => res(q.result as T[]); }; }), store);
const openCrop = async (page: Page) => {
  const crops = await all<{ id: string; slug: string }>(page, 'crops');
  // a COLD start on the address, not a same-page hash change + reload: CI (PR #572, run 45703117051) showed Σήμερα with no sheet, i.e. a pending startup effect had rewritten the
  // address before the reload (the same race crate-label.spec.ts documents). The sheet must be open before any assertion about what it does NOT show.
  await page.goto('about:blank');
  await page.goto(`/#/own/today/sheet/crop/${crops.find((c) => c.slug === 'spinach')!.id}`);
  const sheet = page.getByTestId('sheet-crop');
  await expect(sheet).toBeVisible();
  return sheet;
};

test('after the owner confirmed 0041: the target is an insert-only server row; a change is a new row; no «only on this phone» line, no remove button', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await confirm(page);
  const crop = await openCrop(page);
  await expect(crop.getByTestId('target-local')).toHaveCount(0);
  await crop.getByTestId('target-edit').click();
  await crop.getByTestId('target-crates').fill('120'); await crop.getByTestId('target-since').fill('2026-11-01');
  await crop.getByTestId('target-save').click();
  await expect(crop).toContainText('120 κλούβες από');
  await expect(crop.getByTestId('target-clear')).toHaveCount(0);
  await crop.getByTestId('target-edit').click();
  await crop.getByTestId('target-crates').fill('150'); await crop.getByTestId('target-since').fill('2026-11-01');
  await crop.getByTestId('target-save').click();
  await expect(crop).toContainText('150 κλούβες από');
  const rows = await all<{ target_crates: unknown; season_start: string }>(page, 'crop_targets');
  expect(rows.map((r) => r.target_crates).sort()).toEqual([120, 150]);          // both rows kept: whole numbers, the history stays
  expect(rows.every((r) => r.season_start === '2026-11-01')).toBe(true);
  expect((await all<{ table: string }>(page, 'outbox')).filter((o) => o.table === 'crop_targets')).toHaveLength(2);
});

test('before the confirmation nothing changes: the target stays on this phone and says so', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  const crop = await openCrop(page);
  await expect(crop.getByTestId('target-local')).toBeVisible();
  await crop.getByTestId('target-edit').click();
  await crop.getByTestId('target-crates').fill('90'); await crop.getByTestId('target-since').fill('2026-11-01');
  await crop.getByTestId('target-save').click();
  await expect(crop).toContainText('90 κλούβες από');
  expect(await all(page, 'crop_targets')).toHaveLength(0);
});

test('first time on the server: the target typed on this phone moves up once as a new row and the phone copy is removed', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  let crop = await openCrop(page);
  await crop.getByTestId('target-edit').click();
  await crop.getByTestId('target-crates').fill('77'); await crop.getByTestId('target-since').fill('2026-10-15');
  await crop.getByTestId('target-save').click();
  await expect(crop).toContainText('77 κλούβες από');
  await confirm(page);
  await page.reload();
  crop = page.getByTestId('sheet-crop');
  await expect(crop).toContainText('77 κλούβες από');
  await expect.poll(async () => (await all<{ target_crates: unknown }>(page, 'crop_targets')).map((r) => r.target_crates)).toEqual([77]);
  await page.reload();
  expect(await all(page, 'crop_targets')).toHaveLength(1);                       // not again
});
