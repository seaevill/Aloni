import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// D14: ONE demo mark per screen on the Demo farm (a full-width amber ribbon, sticky, not dismissable), none on the real farm.
// Known exceptions that belong to Codex's screens until their tickets land (docs/handoff/codex-notes.md): the register title badge and the More intro sentence.
const WORD = 'Επίδειξη – φανταστικά στοιχεία';

test('demo: exactly one ribbon on Σήμερα, Φυτά, Χωράφια, Αποθήκη and the worker view; amber, full width, sticky, no close button', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  for (const tab of ['today', 'crops', 'parcels', 'stock']) {
    await page.locator(`nav.tabs [data-tab="${tab}"]`).click();
    await expect(page.getByTestId('demo-banner'), tab).toHaveCount(1);
    expect(await page.locator('main').getByText(WORD).count(), tab).toBe(1);        // the wording appears once
  }
  const ribbon = page.getByTestId('demo-banner');
  const st = await ribbon.evaluate((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { bg: cs.backgroundColor, fg: cs.color, pos: cs.position, w: Math.round(r.width), vw: window.innerWidth, h: Math.round(r.height) }; });
  expect(st.bg).toBe('rgb(255, 237, 194)'); expect(st.fg).toBe('rgb(67, 44, 0)'); expect(st.pos).toBe('sticky'); expect(st.w).toBe(st.vw);
  await expect(ribbon.locator('button')).toHaveCount(0);                               // never dismissable
  await expect(ribbon.locator('svg[data-icon="info"]')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('demo-banner')).toHaveCount(1);
  await expect(page.getByTestId('worker-app').getByText(WORD)).toHaveCount(1);         // and no second intro sentence in the worker view
});

test('real farm: no demo mark anywhere on the main screens', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  for (const tab of ['today', 'crops', 'parcels', 'stock', 'more']) {
    await page.locator(`nav.tabs [data-tab="${tab}"]`).click();
    await expect(page.getByTestId('demo-banner'), tab).toHaveCount(0);
  }
});
