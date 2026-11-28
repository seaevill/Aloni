import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { iphone } from './helpers/iphone';

// The worker's own buttons are 72 px tall (gloves, sun), on a 320, 375 and 390 px phone, in Greek and in Hindi, with no sideways scroll.
// Rule: every button, chip, summary and input inside the worker app is at least 72 px tall (kurallar 7). Anything under that is listed here WITH its reason.
const MIN = 72;
const EXCEPTIONS: Record<string, string> = {};

async function openWorker(page: Page, width: number) {
  await page.setViewportSize({ width, height: 812 });
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
}

// every target in the worker app: id, width, height (an element with no size is not on screen)
const measure = (page: Page) => page.getByTestId('worker-app').evaluate((app) => Array.from(app.querySelectorAll('button, summary, input:not([hidden])')).map((el) => {
  const r = el.getBoundingClientRect();
  return { id: (el as HTMLElement).dataset.testid ?? `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 16)}`, w: r.width, h: r.height };
}).filter((s) => s.w > 0));
const tooSmall = (sizes: { id: string; h: number }[]) => sizes.filter((s) => s.h < MIN && !EXCEPTIONS[s.id]).map((s) => `${s.id} ${Math.round(s.h)}`);

// escape attempt: a 60 px button smuggled into the worker app must be caught, and every listed exception must carry a written reason
test('worker layout check catches a target under 72 px', async ({ page }) => {
  await openWorker(page, 375);
  await page.getByTestId('worker-app').evaluate((app) => {
    const b = document.createElement('button');
    b.dataset.testid = 'smuggled';
    b.textContent = 'x';
    b.style.minHeight = '0';
    b.style.height = '60px';
    app.appendChild(b);
  });
  expect(tooSmall(await measure(page))).toEqual(['smuggled 60']);
  expect(Object.keys(EXCEPTIONS).every((id) => id.length > 0 && EXCEPTIONS[id]!.length > 10), 'every exception has a written reason').toBe(true);
});

for (const width of [320, 375, 390]) {
  test(`worker screens at ${width} px: 72 px worker buttons, every target at least 72 px, no sideways scroll`, async ({ page }) => {
    await openWorker(page, width);
    const langs = page.getByTestId('worker-lang').locator('button');
    for (const lang of [0, (await langs.count()) - 1]) {   // Greek first, Hindi last
      await langs.nth(lang).click();
      for (const tab of ['jobs', 'harvest', 'observe']) {
        await page.getByTestId(`worker-tab-${tab}`).click();
        await expect(page.getByTestId(`worker-tab-${tab}`)).toHaveAttribute('aria-pressed', 'true');
        const at = `${width} px, language ${lang}, ${tab}`;
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${at}: sideways scroll`).toBeLessThanOrEqual(0);
        if (tab === 'harvest') await expect(page.getByTestId('harvest-chip').first()).toBeVisible();   // the chips load with the Demo plantings
        const sizes = await measure(page);
        const seen = sizes.map((x) => x.id);
        for (const id of ({ jobs: ['bell', 'note-text', 'note-add'], harvest: ['harvest-chip'], observe: [] } as Record<string, string[]>)[tab] ?? []) expect(seen, `${at}: ${id} is on screen and measured`).toContain(id);
        expect(tooSmall(sizes), `${at}: shorter than ${MIN} px`).toEqual([]);
        for (const s of sizes) expect(s.w, `${at}: ${s.id} width`).toBeGreaterThanOrEqual(56);
      }
    }
  });
}
