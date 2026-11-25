import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// The worker's own buttons are 72 px tall (gloves, sun), on a 320, 375 and 390 px phone, in Greek and in Hindi, with no sideways scroll.
// Shared widgets (the bell, the owner's tomorrow notes, inputs) keep the app-wide 56 px minimum.
const BIG = ['worker-data-summary', 'harvest-dest-store', 'harvest-dest-dispatch', 'harvest-save', 'harvest-cancel', 'observe-save', 'worker-exit'];

for (const width of [320, 375, 390]) {
  test(`worker screens at ${width} px: 72 px worker buttons, every target at least 56 px, no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await iphone(page);
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await expect(page.getByTestId('today-counts')).toBeVisible();
    await page.locator('nav.tabs [data-tab="more"]').click();
    await page.getByTestId('open-worker-view').click();
    await expect(page.getByTestId('worker-app')).toBeVisible();
    const langs = page.getByTestId('worker-lang').locator('button');
    for (const lang of [0, (await langs.count()) - 1]) {   // Greek first, Hindi last
      await langs.nth(lang).click();
      for (const tab of ['jobs', 'harvest', 'observe']) {
        await page.getByTestId(`worker-tab-${tab}`).click();
        await expect(page.getByTestId(`worker-tab-${tab}`)).toHaveAttribute('aria-pressed', 'true');
        const at = `${width} px, language ${lang}, ${tab}`;
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${at}: sideways scroll`).toBeLessThanOrEqual(0);
        const sizes = await page.getByTestId('worker-app').evaluate((app) => Array.from(app.querySelectorAll('button, summary, input:not([hidden])')).map((el) => {
          const r = el.getBoundingClientRect();
          return { id: (el as HTMLElement).dataset.testid ?? `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 16)}`, w: r.width, h: r.height };
        }).filter((s) => s.w > 0));
        for (const s of sizes) {
          expect(s.h, `${at}: ${s.id} height`).toBeGreaterThanOrEqual(BIG.includes(s.id) ? 72 : 56);
          expect(s.w, `${at}: ${s.id} width`).toBeGreaterThanOrEqual(56);
        }
      }
    }
  });
}
