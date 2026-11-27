// is-4: side-by-side 375 px images, prototype (left) | app (right), for docs/design/compare/2026-11-27/.
// Usage (app built and previewed on :4173): PW_CHROMIUM_PATH=/usr/bin/google-chrome node scripts/compare-shots.mjs
// Read-only for reference/. The app side uses the Demo farm (fictional data).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(path.resolve('app/package.json'));
const { chromium } = require('@playwright/test');
const OUT = path.resolve('docs/design/compare/2026-11-27');
mkdirSync(OUT, { recursive: true });
const proto = pathToFileURL(path.resolve('reference/prototype/index.html')).href;
const exe = process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = () => browser.newContext({ viewport: { width: 375, height: 700 }, deviceScaleFactor: 1, hasTouch: true, locale: 'el-GR', storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'onboarding_seen', value: '1' }] }] } });
const shots = {};
const snap = async (page, name) => { const b = await page.screenshot({ fullPage: true }); shots[name] = b.toString("base64"); if (process.env.DBG) console.log(name, b.readUInt32BE(16), b.readUInt32BE(20)); };

// ---- prototype side (Greek, area in στρέμματα)
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(proto);
  await p.evaluate(() => { S.lang = 'el'; S.area = 'str'; render(true); });
  const go = (v, id) => p.evaluate(([v, id]) => { S.stack = [{ v }]; if (id) S.stack.push({ v: v, id }); render(true); }, [v, id]);
  const tab = (v) => p.evaluate((v) => { S.stack = [{ v }]; render(true); }, v);
  const push = (v, id) => p.evaluate(([v, id]) => { S.stack = [{ v: ROOT[v] || 'today' }, { v, id }]; render(true); }, [v, id]);
  await tab('today'); await snap(p, 'p-today');
  await tab('crops'); await snap(p, 'p-crops');
  const cropId = await p.evaluate(() => Object.keys(CROP)[0]);
  await push('crop', cropId); await snap(p, 'p-crop');
  await p.evaluate(() => { const b = document.querySelector('[data-why]'); if (b) b.click(); }); await p.waitForTimeout(300); shots['p-why'] = (await p.screenshot()).toString('base64');
  await p.evaluate(() => closeSheet());
  await tab('parcels'); await snap(p, 'p-parcels');
  const parcelId = await p.evaluate(() => Object.keys(PARC)[0]);
  if (parcelId) { await push('parcel', parcelId); await snap(p, 'p-parcel'); }
  await tab('stock'); await snap(p, 'p-stock');
  await tab('more'); await snap(p, 'p-more');
  await push('spraylog'); await snap(p, 'p-register');
  await push('orders'); await snap(p, 'p-orders');
  await push('forecast'); await snap(p, 'p-forecast');
  await c.close();
}

// ---- app side (Demo farm)
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto('http://localhost:4173/');
  await p.getByTestId('empty-state').locator('button').nth(1).click();
  await p.getByTestId('today-counts').waitFor();
  await p.addStyleTag({ content: '.toast,.offline-note{display:none !important}' }); // the transient «ready offline» toast is noise in a layout comparison
  const tab = async (id) => { await p.locator(`nav.tabs [data-tab="${id}"]`).click(); await p.waitForTimeout(400); };
  await p.waitForTimeout(500); await snap(p, 'a-today');
  await tab('crops'); await snap(p, 'a-crops');
  await p.getByTestId('crop-open').first().click(); await p.waitForTimeout(400); await snap(p, 'a-crop');
  await tab('parcels'); await snap(p, 'a-parcels');
  await p.getByTestId('parcel-open').first().click(); await p.waitForTimeout(400); await snap(p, 'a-parcel');
  await tab('stock'); await snap(p, 'a-stock');
  await tab('more'); await snap(p, 'a-more');
  await p.getByTestId('open-register').click(); await p.waitForTimeout(400); await snap(p, 'a-register');
  await tab('more'); await p.getByTestId('open-orders').click(); await p.waitForTimeout(400); await snap(p, 'a-orders');
  await tab('today'); await p.getByTestId('urgent-action').click(); await p.waitForTimeout(500);
  shots['a-why'] = (await p.screenshot()).toString('base64'); // the app's closest «why» is the waiting-period sheet
  await c.close();
}

// ---- compose
const pairs = [['today', 'p-today', 'a-today'], ['crops', 'p-crops', 'a-crops'], ['crop-detail', 'p-crop', 'a-crop'], ['why-sheet', 'p-why', 'a-why'], ['parcels', 'p-parcels', 'a-parcels'], ['parcel-detail', 'p-parcel', 'a-parcel'], ['stock', 'p-stock', 'a-stock'], ['more', 'p-more', 'a-more'], ['register', 'p-register', 'a-register'], ['orders', 'p-orders', 'a-orders'], ['forecast', 'p-forecast', null]];
const c = await ctx();
const MAXH = 1800; // very long pages are cut, not squashed
for (const [name, l, r] of pairs) {
  if (!shots[l]) continue;
  const pg = await c.newPage();
  const img = (k, cap) => `<figure><figcaption>${cap}</figcaption>${shots[k] ? `<img src="data:image/png;base64,${shots[k]}">` : '<div class="none">Uygulamada karşılığı yok</div>'}</figure>`;
  await pg.setViewportSize({ width: 790, height: MAXH + 40 });
  await pg.setContent(`<style>body{margin:0;background:#ccc;display:flex;align-items:flex-start;gap:16px;padding:8px;font:600 13px sans-serif}figure{margin:0;width:375px;max-height:${MAXH}px;overflow:hidden}img{display:block;width:375px}figcaption{padding:2px 0}.none{height:300px;background:#eee;display:flex;align-items:center;justify-content:center}</style>${img(l, 'Prototip')}${img(r, 'Uygulama')}`);
  await pg.waitForTimeout(200);
  const h = await pg.evaluate(() => Math.max(...[...document.querySelectorAll("figure")].map((f) => f.offsetHeight)) + 16);
  await pg.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: 790, height: Math.min(h, MAXH + 40) } });
  await pg.close();
}
await browser.close();
console.log('ok', Object.keys(shots).join(' '));
