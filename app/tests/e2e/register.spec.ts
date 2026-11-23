import { readFileSync } from 'node:fs';
import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('the spray register (demo): marked «ΠΡΟΣΧΕΔΙΟ», every field, CSV with the draft notice, printable, no sideways scroll at 375 px', async ({ page }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible(); // the demo is loaded before the register is opened
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-register').click();
  await expect(page.getByTestId('register-draft')).toContainText('ΠΡΟΣΧΕΔΙΟ');
  await expect(page.getByTestId('register-line').first()).toBeVisible();
  expect(await page.getByTestId('register-line').count()).toBeGreaterThanOrEqual(7);
  await expect(page.getByTestId('register-line').first()).toContainText('Ψέκασε');
  await expect(page.getByTestId('register-line').first()).toContainText('Εμβαδόν');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const download = page.waitForEvent('download');
  await page.getByTestId('register-csv').click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/^aloni-demo-psekasmoi-prosxedio-\d{4}-\d{2}-\d{2}\.csv$/);
  const path = test.info().outputPath('r.csv'); await d.saveAs(path);
  const csv = readFileSync(path, 'utf8').split('\r\n');
  expect(csv[0]).toContain('ΠΡΟΣΧΕΔΙΟ');
  expect(csv[1]).toContain('Έναρξη');
  expect(csv[1]).toContain('Λήξη');
  expect(csv[1]).toContain('Παρτίδα');
  expect(csv.length).toBeGreaterThan(8);
  // the machine-readable file: English field names, one header row, a decimal point, ISO 8601 with the Athens offset; warnings come as a separate file
  const dm = page.waitForEvent('download');
  await page.getByTestId('register-csv-machine').click();
  const m = await dm;
  expect(m.suggestedFilename()).toMatch(/^aloni-demo-register-machine-\d{4}-\d{2}-\d{2}\.csv$/);
  const mpath = test.info().outputPath('machine.csv'); await m.saveAs(mpath);
  const mrows = readFileSync(mpath, 'utf8').split('\r\n');
  expect(mrows[0]).toBe('holder_name,holder_vat_id,record_id,amends_record_id,tank_mix_id,product_trade_name,authorisation_number,application_start,application_end,dose_as_entered,dose_unit_as_entered,dose_per_ha,dose_per_ha_unit,treated_area_stremma,treated_area_ha,iacs_parcel_id,parcel_name,crop_slug,eppo_code,bbch_stage,prescription_number,applicator,quantity_used,water_l,label_state,phi_until,rei_until');
  expect(mrows.length).toBeGreaterThan(7);
  expect(mrows[1]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0[23]:00/);
  const dw = page.waitForEvent('download');
  await page.getByTestId('register-csv-warnings').click();
  const w = await dw; const wpath = test.info().outputPath('warnings.csv'); await w.saveAs(wpath);
  expect(readFileSync(wpath, 'utf8').split('\r\n')[0]).toBe('record_id,warning_code');
  const dj = page.waitForEvent('download');
  await page.getByTestId('register-json').click();
  const j = await dj; expect(j.suggestedFilename()).toMatch(/^aloni-demo-register-machine-\d{4}-\d{2}-\d{2}\.json$/);
  const jpath = test.info().outputPath('machine.json'); await j.saveAs(jpath);
  const doc = JSON.parse(readFileSync(jpath, 'utf8')) as { regulation: string; records: unknown[]; warnings: unknown[] };
  expect(doc.regulation).toBe('Regulation (EU) 2023/564');
  expect(doc.records.length).toBe(mrows.length - 2);                  // the same lines as the machine CSV (header and trailing line excluded)
  expect(Array.isArray(doc.warnings)).toBe(true);
  await page.emulateMedia({ media: 'print' }); // the print view hides the buttons and the tab bar
  await expect(page.getByTestId('register-csv')).toBeHidden();
  await expect(page.locator('nav.tabs')).toBeHidden();
  expect(errors).toEqual([]);
});
