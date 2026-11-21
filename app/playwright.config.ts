import { defineConfig } from '@playwright/test';

// iPhone-width viewport (375 px) in WebKit, as required by CLAUDE.md.
// Default is WebKit (iPhone Safari engine). PW_BROWSER=chromium is only a local fallback
// for machines where the WebKit download is blocked; CI always runs WebKit.
// Set PW_CHROMIUM_PATH if Chromium is not at Playwright's default location.
const browserName = (process.env.PW_BROWSER as 'webkit' | 'chromium' | undefined) ?? 'webkit';

const launch = browserName === 'chromium' && process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const device = { browserName, launchOptions: launch, viewport: { width: 375, height: 667 }, hasTouch: true };

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  // The WebKit runner is slower than it was and a DIFFERENT single test failed on identical code in each run (2026-11-20): a failed test is retried ONCE in CI and reported as «flaky» (it is never hidden:
  // a deterministic failure fails twice), and the default 5 s for an expectation is doubled. Nothing is skipped or loosened in the tests themselves.
  timeout: process.env.CI ? 60_000 : 30_000,   // the CI runner (arm64) is slow: a test that took 30 s there failed on the clock, not on an assertion (hardening.spec, 2026-11-20)
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  projects: [
    // the real build: the live features are OFF
    { name: 'app', testIgnore: /live-.*\.spec\.ts/, use: { ...device, locale: 'el-GR', baseURL: 'http://localhost:4173' } },
    // the e2e build (--mode e2e): sign-in, invitations, the worker's real screens and the sync are ON, against a MOCK backend answered by the tests themselves
    { name: 'live', testMatch: /live-.*\.spec\.ts/, use: { ...device, locale: 'el-GR', baseURL: 'http://localhost:4174', serviceWorkers: 'block' } }, // no service worker: the tests answer the mock backend themselves (WebKit does not route a request a service worker handled)
  ],
  webServer: [
    { command: 'VITE_DS_GALLERY=true npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 120000 },
    { command: 'npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4174', url: 'http://localhost:4174', reuseExistingServer: !process.env.CI, timeout: 120000 },
  ],
});
