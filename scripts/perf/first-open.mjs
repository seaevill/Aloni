// First open on a slow phone connection (E8): serves the production build (dist) with gzip like the real host over a «slow 3G» link and reports
//   (1) when the first Σήμερα screen is visible and how many bytes had arrived by then, and
//   (2) when the offline copy (service worker precache) is complete and how many bytes it cost in total.
// The link limit is applied by the server (one shared 400 kbit/s for the page and the service worker, 400 ms before every response), because the service worker's traffic is not visible to the page's network emulation.
// Run from the repo root after `npm run build -w app`:  PW_CHROMIUM_PATH=/path/to/chromium node scripts/perf/first-open.mjs
// Chromium only (WebKit cannot throttle). Numbers move with the machine: compare runs made on the same machine, before and after a change.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';

const DIST = join(process.cwd(), 'app', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
// one shared 400 kbit/s link for everything (the page AND the service worker), plus 400 ms before the first byte of every response
const RATE = (400 * 1024) / 8; const TICK = 50; const PER_TICK = Math.round((RATE * TICK) / 1000);
const active = []; let served = 0;
setInterval(() => {
  if (active.length === 0) return;
  let budget = PER_TICK; const share = Math.max(1, Math.floor(budget / active.length));
  for (const a of [...active]) {
    const n = Math.min(share, a.rest.length, budget); a.res.write(a.rest.subarray(0, n)); a.rest = a.rest.subarray(n); budget -= n; served += n;
    if (a.rest.length === 0) { a.res.end(); active.splice(active.indexOf(a), 1); }
  }
}, TICK);
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path === '/' ? 'index.html' : path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const body = readFileSync(file);
  const zip = /\.(html|js|css|json|svg|webmanifest)$/.test(file) && (req.headers['accept-encoding'] ?? '').includes('gzip');
  const out = zip ? gzipSync(body, { level: 6 }) : body;
  res.writeHead(200, { 'content-type': type, ...(zip ? { 'content-encoding': 'gzip' } : {}), 'content-length': out.length, 'cache-control': file.endsWith('sw.js') ? 'no-cache' : 'max-age=3600' });
  setTimeout(() => active.push({ res, rest: out }), 400);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();
const t0 = Date.now();
if (process.env.PERF_LOG) setInterval(() => console.error(`${Math.round((Date.now() - t0) / 1000)}s served ${Math.round(served / 1024)} KB, ${active.length} in flight`), 5000);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'commit' });
await page.locator('h1').first().waitFor({ timeout: 120_000 });
const tShown = Date.now() - t0;
const bytesShown = served;
for (let i = 0; i < 1200; i++) {                                                  // the install step finishes only when every precached file arrived: wait for «activated» (checked twice a second, at most 10 minutes)
  if (await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated').catch(() => false)) break;
  await page.waitForTimeout(500);
}
const tReady = Date.now() - t0;
const out = { throttle: 'slow 3G (400 kbit/s shared, 400 ms per response)', firstScreenSeconds: +(tShown / 1000).toFixed(1), bytesByFirstScreenKB: Math.round(bytesShown / 1024), offlineCopyReadySeconds: +(tReady / 1000).toFixed(1), totalBytesKB: Math.round(served / 1024) };
console.log(JSON.stringify(out));
await browser.close(); process.exit(0);
