import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// QUEUE 34e: with the season Demo every number on Σήμερα opens its source sheet and the source agrees with the number.
test('season Demo: each Σήμερα count opens its source, and the totals agree', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors = await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('demo-season-load').click();
  await expect(page.getByText('Η επίδειξη φορτώθηκε.')).toBeVisible();
  await page.locator('nav.tabs [data-tab="today"]').click();
  const sheet = page.locator('[data-testid^="sheet-"]').first();
  const close = async () => { await page.getByTestId('sheet-close').first().click(); await expect(sheet).toHaveCount(0); };
  const tiles = ['kpi-parcels', 'kpi-crops', 'today-cut7', 'today-cut28', 'today-canharvest'];
  for (const id of tiles) {
    const tile = page.getByTestId(id); await expect(tile, id).toBeVisible();
    const number = (await tile.locator('strong').first().innerText()).replace(/\D+/g, ' ').trim().split(' ')[0]!;
    await tile.click();
    await expect(sheet, `${id} opens a source`).toBeVisible();
    await page.waitForTimeout(600);                                                  // the source reads its rows after it opens
    if (id === 'kpi-parcels') { expect(number).toBe('7'); for (const name of ['Μεγάλος Κάμπος', 'Λάκκα', 'Πευκάκια', 'Ανατολικό', 'Κοντά στο Ρέμα', 'Ράχη', 'Μικρό Περιβόλι']) await expect(sheet).toContainText(name); }
    else if (id === 'kpi-crops') await expect.poll(async () => ((await sheet.innerText()).match(/φυτεύσεις/g) ?? []).length, { message: 'one source row per counted crop' }).toBe(Number(number));
    else expect(await sheet.innerText(), `${id}: the source shows ${number}`).toContain(number);
    await close();
  }
  expect(errors.filter((e) => !/icon-192|net::ERR/.test(e))).toEqual([]);
});
