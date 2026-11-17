import { expect, test } from '@playwright/test';
import { APP_NAME } from '../../src/config';

// The Greek UI chrome must not contain English words (the v2 prototype showed an English toast in Greek mode).
const TABS = ['today', 'crops', 'parcels', 'stock', 'more'] as const;

test('Greek UI has no English words on any tab', async ({ page }) => {
  await page.goto('/');
  for (const id of TABS) {
    await page.locator(`nav.tabs [data-tab="${id}"]`).click();
    // the build id after the version (e.g. «· 4f3adc1») is a hex commit, not a word
    const text = (await page.locator('body').innerText()).replaceAll(APP_NAME, '').replace(/·\s*[0-9a-f]{5,7}\b/g, '');
    const latin = text.match(/[A-Za-z]{3,}/g) ?? [];
    expect(latin, `Latin words on tab ${id}`).toEqual([]);
  }
});
