import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { goTab } from './helpers/tabs';
import { iphone } from './helpers/iphone';

// QUEUE 35: with the season Demo every tab and every sub-page opens at 320 / 375 / 390 px without a console error or sideways scroll. SHOTS=1 also writes the 375 px screenshots to docs/design/demo-season-2026-11-26/.
const DIR = '../docs/design/demo-season-2026-11-26';
const back = (page: Page) => page.getByRole('button', { name: /Πίσω|Επιστροφή|Back|Geri/ }).first().click();
const RUNS: Array<[string, number]> = [['el', 320], ['el', 375], ['el', 390], ['en', 375], ['tr', 375], ['classic', 375]];
for (const [language, width] of RUNS) {
  test(`${language === 'classic' ? 'classic' : 'season'} Demo walk at ${width} px (${language})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 812 });
    await page.addInitScript((l) => { try { localStorage.setItem('lang', l === 'classic' ? 'el' : l); } catch { /* ignore */ } }, language);
    const errors = await iphone(page);
    let n = 0;
    const problems: string[] = [];
    const visit = async (name: string) => {
      await page.waitForTimeout(350);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${name} at ${width}`).toBeLessThanOrEqual(width);
      const body = await page.locator('body').innerText();
      expect(body.match(/\bNaN\b|\bundefined\b|\bnull\b|\[object|Infinity|€ ?-?0,00 €/g), `${name}: placeholder garbage on screen`).toBeNull();      // an unknown value must read «άγνωστο», never NaN / undefined / null
      if (width === 375) { const axe = await new AxeBuilder({ page }).analyze(); problems.push(...axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${name}: axe ${v.id} (${v.impact}) ${v.nodes.length}×`)); }
      if (process.env.SHOTS === '1' && width === 375 && language === 'el') await page.screenshot({ path: `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: false });
    };
    const lower = async (name: string) => { await page.evaluate(() => window.scrollTo(0, 900)); await visit(name); await page.evaluate(() => window.scrollTo(0, 0)); };
    const tab = (id: string) => goTab(page, id);
    await tab('more'); await (language === 'classic' ? page.getByTestId('demo-load') : page.getByTestId('demo-season-load')).click(); await expect(page.getByTestId('demo-banner')).toBeVisible();
    await tab('today'); await visit('today'); await lower('today-lower');
    for (const id of ['kpi-parcels', 'kpi-crops', 'today-cut7-big', 'today-canharvest']) { await page.getByTestId(id).click(); await visit(`today-${id}`); await page.getByTestId('sheet-close').first().click(); }
    await page.getByTestId('history-open').click(); await visit('history'); await back(page);
    await tab('crops'); await visit('crops'); await page.getByTestId('crop-open').first().click(); await visit('crop-detail'); await lower('crop-detail-lower'); await back(page);
    await page.getByTestId('season-calendar-open').click(); await visit('season-calendar'); await back(page);
    await tab('parcels'); await visit('parcels'); await page.getByTestId('parcel-open').first().click(); await visit('parcel-detail'); await lower('parcel-detail-lower'); await back(page);
    await tab('stock'); await visit('stock'); await lower('stock-lower'); await page.getByTestId('product-source-open').first().click(); await visit('product-sheet'); await page.getByTestId('sheet-close').first().click();
    await page.getByTestId('stock-open').first().click(); await visit('stock-lots'); await back(page);
    await tab('more'); await visit('more');
    for (const id of ['open-register', 'open-orders', 'open-customers', 'open-money', 'open-workers', 'open-weekly-report', 'open-photos', 'open-info']) { await page.getByTestId(id).click(); await visit(id); if (id === 'open-customers' && (await page.getByTestId('customer').count()) > 0) { await page.getByTestId('customer').first().click(); await visit('customer-page'); await back(page); } if (id === 'open-money' && (await page.getByTestId('money-entry').count()) > 0) { await page.getByTestId('money-entry').first().click(); await visit('money-entry'); await page.getByTestId('sheet-close').first().click(); } await back(page); }
    await page.getByTestId('open-worker-view').click(); await visit('worker-view');
    expect(problems, 'serious/critical accessibility problems (axe)').toEqual([]);
    expect(errors.filter((e) => !/icon-192|net::ERR/.test(e)), `console errors at ${width}`).toEqual([]);
  });
}
