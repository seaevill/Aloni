import { test as base } from '@playwright/test';

export * from '@playwright/test';

// Diagnostic wrapper around Playwright's `test` (same behaviour, nothing skipped): while a test runs, the page's own events are remembered —
// console errors, page errors, failed requests, every navigation / reload of the main frame, with the time since the start. If the test FAILS they are attached as «browser-log»
// and the CI reporter prints them. Purpose: explain a failure that only happens on the CI WebKit runner (a screen that went back to an earlier state).
export const test = base.extend<{ browserLog: void }>({
  browserLog: [async ({ page }, use, testInfo) => {
    // every tap the page received (time, element, test id, text, position) and the app's own «demo» marks (set in loadDemo): they tell «the tap never reached the button» from «the demo started and never finished»
    await page.addInitScript(() => {
      const w = window as unknown as { __clicks: unknown[] };
      w.__clicks = [];
      document.addEventListener('click', (e) => { const el = e.target as Element | null; w.__clicks.push([Math.round(performance.now()), el?.tagName ?? '', el?.getAttribute?.('data-testid') ?? '', (el?.textContent ?? '').slice(0, 24), Math.round((e as MouseEvent).clientX), Math.round((e as MouseEvent).clientY)]); }, true);
    });
    const started = Date.now(); const lines: string[] = [];
    const at = (): string => `+${Date.now() - started} ms`;
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') lines.push(`${at()} console.${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => lines.push(`${at()} pageerror: ${String(e).slice(0, 200)}`));
    page.on('requestfailed', (r) => lines.push(`${at()} requestfailed: ${r.url().slice(-80)} ${r.failure()?.errorText ?? ''}`));
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) lines.push(`${at()} navigated: ${f.url().slice(-80)}`); });
    page.on('domcontentloaded', () => lines.push(`${at()} domcontentloaded`));
    page.on('crash', () => lines.push(`${at()} PAGE CRASHED`));
    await use();
    if (testInfo.status !== testInfo.expectedStatus) {
      const inPage = await page.evaluate(() => ({ now: Math.round(performance.now()), clicks: (window as unknown as { __clicks?: unknown[] }).__clicks ?? [], marks: performance.getEntriesByType('mark').map((m) => [m.name, Math.round(m.startTime)]) })).catch(() => undefined);
      lines.push(`in-page: ${JSON.stringify(inPage)}`);
    }
    if (testInfo.status !== testInfo.expectedStatus) await testInfo.attach('browser-log', { body: lines.join('\n') || '(no events)', contentType: 'text/plain' });
  }, { auto: true }],
});
