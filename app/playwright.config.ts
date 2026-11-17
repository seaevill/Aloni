import { defineConfig } from '@playwright/test';

// iPhone-width viewport (375 px) in WebKit, as required by CLAUDE.md.
// Default is WebKit (iPhone Safari engine). PW_BROWSER=chromium is only a local fallback
// for machines where the WebKit download is blocked; CI always runs WebKit.
// Set PW_CHROMIUM_PATH if Chromium is not at Playwright's default location.
const browserName = (process.env.PW_BROWSER as 'webkit' | 'chromium' | undefined) ?? 'webkit';

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', browserName,
    launchOptions: browserName === 'chromium' && process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}, viewport: { width: 375, height: 667 }, hasTouch: true },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
