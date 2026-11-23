import { readFileSync } from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

// CI cannot hand us the Playwright trace (artifact downloads are blocked for the reviewer), so a failed test prints what the page looked like at the moment it failed:
// Playwright's own «error-context» page snapshot (the accessibility tree of the screen) and the browser console errors, straight into the job log. Reads files only; changes nothing, skips nothing.
export default class FailureContext implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed' || result.status === 'skipped') return;
    const ctx = result.attachments.find((a) => a.name === 'error-context' && a.path !== undefined);
    let body = '(no page snapshot attached)';
    if (ctx?.path !== undefined) { try { body = readFileSync(ctx.path, 'utf8').split('\n').slice(0, 130).join('\n'); } catch { body = '(snapshot unreadable)'; } }
    const blog = result.attachments.find((a) => a.name === 'browser-log');
    const events = blog?.body !== undefined ? blog.body.toString('utf8') : '(none)';
    process.stdout.write(`\n=== FAILURE CONTEXT: ${test.titlePath().slice(1).join(' › ')} (attempt ${result.retry + 1}, ${result.duration} ms)\n--- browser log\n${events}\n--- page snapshot\n${body}\n=== END FAILURE CONTEXT\n`);
  }
  printsToStdio(): boolean { return false; }
  onEnd(_result: FullResult): void { /* nothing to summarise */ }
}
