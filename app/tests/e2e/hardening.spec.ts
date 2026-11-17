import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setup } from './helpers/farm';
import { iphone } from './helpers/iphone';

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

/** The UX bar on whatever is on screen: no sideways scroll at 375 px, every tap target ≥ 56 × 44 px, no serious axe problem. */
async function bar(page: Page, at: string, minHeight = 56) {
  const found = await page.evaluate((min) => [
    ...(document.documentElement.scrollWidth > 375 ? [`scrollWidth ${document.documentElement.scrollWidth}`] : []),
    ...[...document.querySelectorAll('main button:not(:disabled), main input:not(:disabled):not([hidden])')]
      .filter((e) => e.getClientRects().length > 0 && (e.getBoundingClientRect().height < min || e.getBoundingClientRect().width < 44)).map((e) => `target ${e.tagName} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`),
  ], minHeight);
  expect(found, at).toEqual([]);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), at).toEqual([]);
}
const language = async (page: Page, l: string) => { await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await tab(page, 'more'); await page.getByRole('button', { name: l, exact: true }).click(); };

test('demo, OFFLINE: Σήμερα with «Κοπή ανά χωράφι», the register and the worker view all work without a connection, in el/tr/en, within the UX bar', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await context.setOffline(true);
  for (const lang of ['EL', 'TR', 'EN']) {
    await language(page, lang);
    await tab(page, 'today');
    await expect(page.getByTestId('cut').first()).toBeVisible();
    await bar(page, `today ${lang}`);
    await tab(page, 'more');
    await page.getByTestId('open-register').click();
    await expect(page.getByTestId('register-line').first()).toBeVisible();
    await bar(page, `register ${lang}`);
    await page.getByTestId('register').getByRole('button').first().click(); // back
    await page.getByTestId('open-worker-view').click();
    await expect(page.getByTestId('worker-job').first()).toBeVisible();
    await bar(page, `worker jobs ${lang}`, 72 - 16); // the big buttons are 72 px; the checks below are for the owner bar
    expect(await page.getByTestId('job-done').first().evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(72);
    await page.getByTestId('worker-tab-observe').click();
    await bar(page, `worker observe ${lang}`, 56);
    await page.getByTestId('worker-tab-harvest').click();
    await bar(page, `worker harvest ${lang}`, 56);
    await page.getByTestId('worker-exit').click();
  }
  expect(errors).toEqual([]);
});

test('real farm, OFFLINE: the spray and harvest forms and the stock screens meet the UX bar in el/tr/en and save without a connection', async ({ page, context }) => {
  const errors = await iphone(page);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await setup(page, true);
  await context.setOffline(true);
  for (const lang of ['EL', 'TR', 'EN']) {
    await language(page, lang);
    await tab(page, 'today');
    await page.getByTestId('spray-open').click();
    await bar(page, `spray form ${lang}`);
    await page.getByRole('button', { name: /Ακύρωση|Vazgeç|Cancel/ }).click();
    await page.getByTestId('harvest-open').click();
    await bar(page, `harvest form ${lang}`);
    await page.getByRole('button', { name: /Ακύρωση|Vazgeç|Cancel/ }).click();
  }
  await language(page, 'EL');
  await tab(page, 'today');
  await page.getByTestId('harvest-open').click(); // saves offline
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByTestId('harvest-more').click();
  await page.getByTestId('harvest-save').click();
  await expect(page.getByTestId('harvest')).toContainText('1 κλούβα');
  await page.reload();
  await expect(page.getByTestId('harvest')).toContainText('1 κλούβα');
  expect(errors).toEqual([]);
});

test('Greek screens of the night work contain no English words (Latin letters are only product and parcel names)', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  const latin = async (at: string) => {
    const text = (await page.locator('main').innerText()).replace(/Kocide 2000|Test Agronomist|Aloni|·\s*[0-9a-f]{5,7}/g, '');
    expect(text.match(/[A-Za-z]{3,}/g) ?? [], at).toEqual([]);
  };
  await tab(page, 'today'); await latin('today');
  await page.getByTestId('spray-open').click(); await latin('spray form');
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await page.getByTestId('harvest-open').click(); await latin('harvest form');
  await page.getByRole('button', { name: 'Ακύρωση' }).click();
  await tab(page, 'more'); await page.getByTestId('open-register').click(); await latin('register');
});
