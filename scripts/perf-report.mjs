// Performance report (never fails the build; it only WARNS). Reads the built app (app/dist) and prints a Markdown table: size of every asset (raw and gzip) and the load time
// of the first screen in a real browser (WebKit in CI, as an iPhone would). Budgets are in BUDGET below; going over one prints «⚠» and a GitHub warning annotation.
// Usage: node scripts/perf-report.mjs   (after `npm run build`; writes to $GITHUB_STEP_SUMMARY when it exists)
import { readdirSync, readFileSync, statSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET = { jsGzipKb: 350, cssGzipKb: 30, firstLoadMs: 3000 };   // provisional: Bora can change them
const dist = join(process.cwd(), 'app', 'dist', 'assets');
const rows = readdirSync(dist).map((f) => { const b = readFileSync(join(dist, f)); return { f, raw: statSync(join(dist, f)).size, gz: /\.woff2$/.test(f) ? statSync(join(dist, f)).size : gzipSync(b).length }; });
const sum = (re) => rows.filter((r) => re.test(r.f)).reduce((a, r) => a + r.gz, 0) / 1024;
const html = readFileSync(join(process.cwd(), 'app', 'dist', 'index.html'), 'utf8');
const initial = new Set([...html.matchAll(/assets\/([^"']+\.js)/g)].map((m) => m[1]));            // what the FIRST screen loads; the map and its drawing library load only when the owner opens a map
const js = rows.filter((r) => initial.has(r.f)).reduce((a, r) => a + r.gz, 0) / 1024; const lazy = rows.filter((r) => /\.js$/.test(r.f) && !initial.has(r.f)).reduce((a, r) => a + r.gz, 0) / 1024;
const css = sum(/\.css$/);
const out = ['## Performance report', '', '| file | raw KB | gzip KB |', '|---|---:|---:|', ...rows.map((r) => `| ${r.f} | ${(r.raw / 1024).toFixed(1)} | ${(r.gz / 1024).toFixed(1)} |`), ''];
const warn = [];
if (js > BUDGET.jsGzipKb) warn.push(`JavaScript ${js.toFixed(0)} KB gzip is over the ${BUDGET.jsGzipKb} KB budget`);
if (css > BUDGET.cssGzipKb) warn.push(`CSS ${css.toFixed(0)} KB gzip is over the ${BUDGET.cssGzipKb} KB budget`);
out.push(`Lazy JavaScript (loaded on demand, e.g. the map): ${lazy.toFixed(1)} KB gzip`, `JavaScript on the first screen: ${js.toFixed(1)} KB gzip (budget ${BUDGET.jsGzipKb}) ${js > BUDGET.jsGzipKb ? '⚠' : '✓'}`, `CSS total: ${css.toFixed(1)} KB gzip (budget ${BUDGET.cssGzipKb}) ${css > BUDGET.cssGzipKb ? '⚠' : '✓'}`);
try {
  const { webkit, chromium } = await import('playwright');
  const { spawn } = await import('node:child_process');
  const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', '4180'], { cwd: join(process.cwd(), 'app'), stdio: 'ignore', detached: true });
  await new Promise((r) => setTimeout(r, 3000));
  let browser; try { browser = await webkit.launch(); } catch { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox'] }); }
  const page = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  const t0 = Date.now();
  await page.goto('http://localhost:4180/', { waitUntil: 'load' });
  await page.locator('nav.tabs').waitFor();
  const ms = Date.now() - t0;
  await browser.close(); try { process.kill(-srv.pid); } catch { /* already gone */ }
  out.push(`First screen ready: ${ms} ms on this machine (budget ${BUDGET.firstLoadMs} ms; a CI machine is not a phone, so read it as a trend) ${ms > BUDGET.firstLoadMs ? '⚠' : '✓'}`);
  if (ms > BUDGET.firstLoadMs) warn.push(`first screen took ${ms} ms (budget ${BUDGET.firstLoadMs} ms)`);
} catch (e) { out.push(`First-load timing skipped: ${String(e).slice(0, 120)}`); }
const text = out.join('\n');
console.log(text);
for (const w of warn) console.log(`::warning title=Performance budget::${w}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
process.exit(0);   // a report never fails the build
