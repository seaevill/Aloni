import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// E6 season target on the crop sheet: unknown with its reason at first; a wrong number or missing date is refused in plain words; a saved target shows the crates logged since the start day (or says there is nothing readable), what remains and a ring;
// it is kept on THIS phone (and says so), survives a reload, and can be removed. Demo farm (its harvests are the sample records).
test.use({ viewport: { width: 375, height: 812 } });

test('set, refuse, show, keep and remove a season target', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();                      // the Demo farm
  await expect(page.getByTestId('kpi-crops')).toBeVisible();
  // the sample farm has no readable harvest: write one (30 crates today) for the first planting's crop, then open that crop's sheet by its address
  const cropId = await page.evaluate(() => new Promise<string>((ok, bad) => {
    const o = indexedDB.open('aloni'); o.onerror = () => bad(new Error('open'));
    o.onsuccess = () => {
      const tx = o.result.transaction(['plantings', 'job_harvest'], 'readwrite'); const g = tx.objectStore('plantings').getAll();
      g.onsuccess = () => { const p = (g.result as Array<{ id: string; farm_id: string; crop_id: string }>)[0]!; tx.objectStore('job_harvest').put({ id: 'h-target-1', farm_id: p.farm_id, planting_id: p.id, crates_str: '30', harvested_at: new Date().toISOString(), created_at: new Date().toISOString() }); tx.oncomplete = () => ok(p.crop_id); };
    };
  }));
  await page.evaluate((id) => { location.hash = `#/demo/today/sheet/crop/${id}`; }, cropId);
  await page.reload();
  const crop = page.getByTestId('sheet-crop');
  await expect(crop).toContainText('δεν έχει οριστεί στόχος');                                   // unknown, with its reason
  await expect(crop.getByTestId('target-local')).toContainText('μόνο σε αυτό το τηλέφωνο');       // honest: not on the server yet
  await crop.getByTestId('target-edit').click();
  await crop.getByTestId('target-crates').fill('0'); await crop.getByTestId('target-since').fill('2020-01-01');
  await crop.getByTestId('target-save').click();
  await expect(crop.getByRole('alert')).toContainText('ακέραιο αριθμό κλουβών');                // refused: no guess
  await crop.getByTestId('target-crates').fill('100'); await crop.getByTestId('target-since').fill('');
  await crop.getByTestId('target-save').click();
  await expect(crop.getByRole('alert')).toContainText('ημερομηνία έναρξης');
  await crop.getByTestId('target-since').fill('2020-01-01');
  await crop.getByTestId('target-save').click();
  await expect(crop.getByTestId('target-form')).toHaveCount(0);
  await expect(crop).toContainText('100 κλούβες από');
  const ring = crop.getByTestId('target-ring');
  await expect(ring).toBeVisible();
  const done = Number((await crop.locator('.ds-fact').filter({ hasText: 'Καταγεγραμμένες από την έναρξη' }).innerText()).replace(/\D+/g, ' ').trim().split(' ').pop());   // the demo farm may already hold crates of this crop: use what the sheet says it logged
  expect(done).toBeGreaterThanOrEqual(30); expect(done).toBeLessThan(100);
  await expect(ring).toHaveAttribute('data-percent', String(done));                              // target 100: the percent is the crates done (whole, rounded down)
  await expect(ring.locator('.ds-ring-days')).toHaveText(String(100 - done));                    // and what remains is the rest
  await page.screenshot({ path: '../docs/design/compare/sprint/cc-target-ring.png' });
  await page.reload();                                                                           // kept on the phone (the address brings the crop sheet back)
  await expect(page.getByTestId('sheet-crop')).toContainText('100 κλούβες από');
  await page.getByTestId('sheet-crop').getByTestId('target-clear').click();
  await expect(page.getByTestId('sheet-crop')).toContainText('δεν έχει οριστεί στόχος');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
