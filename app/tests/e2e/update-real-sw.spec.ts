import { expect, test } from './helpers/test';
import { createServer, type Server } from 'node:http';
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

// E8: a REAL service-worker update, not the test hook: the production build is served from a temporary copy; the page installs the worker and is controlled by it; then the worker file on the server changes
// (a new deploy), the browser looks for an update, the new worker waits, and the bar «Νέα έκδοση» appears — and nothing is reloaded behind the user's back until the button is tapped.
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const DIST = join(process.cwd(), 'dist');

test.skip(!existsSync(join(DIST, 'sw.js')), 'needs the production build (npm run build)');
test.use({ viewport: { width: 375, height: 812 } });

test('a new deploy: the worker file changes, the bar appears by itself, the half-typed form stays, and the button applies it', async ({ page }) => {
  test.setTimeout(120_000);
  const root = mkdtempSync(join(tmpdir(), 'aloni-sw-'));
  cpSync(DIST, root, { recursive: true });
  const server: Server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path === '/' ? 'index.html' : path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((ok) => server.listen(0, ok));
  const port = (server.address() as { port: number }).port;
  try {
    await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));                 // a new address: skip the first-run cards
    await page.goto(`http://localhost:${port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);                                  // the first worker is installed and active
    await page.reload();                                                                         // now this page is controlled by it
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30_000 }).toBe(true);
    await page.locator('nav.tabs [data-tab="more"]').click();
    await page.getByTestId('open-workers').click();
    await page.getByTestId('worker-name').fill('Γιώργος');                                       // a half-typed form
    await expect(page.getByTestId('update-bar')).toHaveCount(0);                                 // no new version yet: no bar
    appendFileSync(join(root, 'sw.js'), `\n// deploy ${Date.now()}\n`);                          // a new deploy: the worker file is different now
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });   // what the app does every hour and on return to the screen
    await expect(page.getByTestId('update-bar')).toBeVisible({ timeout: 30_000 });             // the new worker is waiting: the bar says so
    await expect(page.getByTestId('worker-name')).toHaveValue('Γιώργος');                        // nothing was reloaded behind the user's back
    await page.waitForTimeout(2500);                                                              // longer than the reload fallback
    await expect(page.getByTestId('worker-name')).toHaveValue('Γιώργος');
    const reloaded = page.waitForEvent('load', { timeout: 15_000 });
    await page.getByTestId('update-apply').click();                                              // the owner chooses the moment
    await reloaded;
    await expect(page.getByTestId('update-bar')).toHaveCount(0);
    await expect(page.locator('nav.tabs')).toBeVisible();                                        // the app is back and working
  } finally {
    server.close(); rmSync(root, { recursive: true, force: true });
  }
});
