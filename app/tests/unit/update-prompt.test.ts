import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mayApplyByItself } from '../../src/pwa/update';

const cfg = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
describe('a new version never replaces the screen behind the user\'s back (T2)', () => {
  it('the service worker is configured to PROMPT: no skipWaiting, no clientsClaim, no autoUpdate, no duplicate asset list', () => {
    expect(cfg).toContain("registerType: 'prompt'");
    expect(cfg).toContain('skipWaiting: false'); expect(cfg).toContain('clientsClaim: false');
    expect(cfg).not.toMatch(/skipWaiting:\s*true|clientsClaim:\s*true|autoUpdate/);
    expect(cfg).not.toContain('includeAssets');
  });
  it('applies by itself only in the background and with nothing typed; otherwise the bar waits for a tap', () => {
    expect(mayApplyByItself({ hidden: true, dirty: false })).toBe(true);
    expect(mayApplyByItself({ hidden: true, dirty: true })).toBe(false);     // a half-typed form: never
    expect(mayApplyByItself({ hidden: false, dirty: false })).toBe(false);   // the app is on screen: ask
    expect(mayApplyByItself({ hidden: false, dirty: true })).toBe(false);
  });
});
