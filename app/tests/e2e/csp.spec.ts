import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The built app must work under the real CSP from public/_headers (vite preview does not send it, so we add it).
const csp = /Content-Security-Policy:\s*(.+)/.exec(readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8'))![1].trim();

test('the app runs under the production CSP: no violations, demo import and service worker work', async ({ page, context }) => {
  await context.route('**/*', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp.replace('; upgrade-insecure-requests', '') } });
  });
  const problems: string[] = [];
  page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) problems.push(m.text()); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`Refused to: ${e.violatedDirective} ${e.blockedURI}`)));

  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.locator('main button.btn').first().click(); // load the demo farm (IndexedDB)
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('today-counts')).toContainText('5');
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active)).toBe(true);
  expect(problems).toEqual([]);
});

test('the version with its build id is visible in More', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await expect(page.locator('main')).toContainText(/Έκδοση: \d+\.\d+\.\d+ · \w{5,7}/);
});
