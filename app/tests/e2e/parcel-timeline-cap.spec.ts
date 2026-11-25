import { expect, test, type Page } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Review follow-up (docs/reviews/team/2026-11-25-independent-504-507.md, S5 + cap): the «Χρονολόγιο» lists a harvest WITHOUT a date (the productivity counts it, so the
// history shows it too, last, its date «άγνωστο»), and says on screen when it shows only the newest 20 records.
const seedHarvests = (page: Page, days: readonly string[]) => page.evaluate((list) => new Promise<void>((ok, bad) => {
  const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
  o.onsuccess = () => {
    const tx = o.result.transaction(['plantings', 'job_harvest'], 'readwrite');
    const pl = tx.objectStore('plantings').getAll();
    tx.oncomplete = () => ok();
    pl.onsuccess = () => {
      const p = (pl.result as Array<{ id: string; farm_id: string }>)[0]!;
      list.forEach((at, i) => tx.objectStore('job_harvest').put({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, farm_id: p.farm_id, planting_id: p.id, harvested_at: at, crates_str: '5', created_at: new Date().toISOString() }));
    };
  };
}), days);

const openParcel = async (page: Page) => {
  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('timeline')).toBeVisible();
};

test('a harvest without a date is listed in the parcel history, last, with its date unknown; no «newest 20» note on a short history', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await seedHarvests(page, ['']);
  await openParcel(page);
  const events = page.getByTestId('timeline').getByTestId('timeline-event');
  await expect(events.last()).toHaveAttribute('data-kind', 'harvest');
  await expect(events.last()).toContainText('Συγκομιδή: Σπανάκι · 5 κλούβες');
  await expect(events.last()).toContainText('άγνωστο');
  await events.last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../docs/design/timeline-undated-after-375.png' });
  await expect(page.getByTestId('timeline-cap')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a long parcel history shows the newest 20 records and says so on screen', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await seedHarvests(page, Array.from({ length: 25 }, (_, i) => `2026-10-${String(1 + i).padStart(2, '0')}T06:00:00.000Z`));
  await openParcel(page);
  await expect(page.getByTestId('timeline').getByTestId('timeline-event')).toHaveCount(20);
  await expect(page.getByTestId('timeline-cap')).toHaveText('Εμφανίζονται οι 20 πιο πρόσφατες καταγραφές.');
  await page.getByTestId('timeline-cap').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../docs/design/timeline-cap-after-375.png' });
  expect(errors).toEqual([]);
});
