import { test as base } from '@playwright/test';

export * from '@playwright/test';

// Diagnostic wrapper around Playwright's `test` (same behaviour, nothing skipped): while a test runs, the page's own events are remembered —
// console errors, page errors, failed requests, every navigation / reload of the main frame, with the time since the start. If the test FAILS they are attached as «browser-log»
// and the CI reporter prints them. Purpose: explain a failure that only happens on the CI WebKit runner (a screen that went back to an earlier state).
export const test = base.extend<{ browserLog: void }>({
  browserLog: [async ({ page }, use, testInfo) => {
    const started = Date.now(); const lines: string[] = [];
    const at = (): string => `+${Date.now() - started} ms`;
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') lines.push(`${at()} console.${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => lines.push(`${at()} pageerror: ${String(e).slice(0, 200)}`));
    page.on('requestfailed', (r) => lines.push(`${at()} requestfailed: ${r.url().slice(-80)} ${r.failure()?.errorText ?? ''}`));
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) lines.push(`${at()} navigated: ${f.url().slice(-80)}`); });
    page.on('domcontentloaded', () => lines.push(`${at()} domcontentloaded`));
    page.on('crash', () => lines.push(`${at()} PAGE CRASHED`));
    await use();
    if (testInfo.status !== testInfo.expectedStatus) await testInfo.attach('browser-log', { body: lines.join('\n') || '(no events)', contentType: 'text/plain' });
  }, { auto: true }],
});
