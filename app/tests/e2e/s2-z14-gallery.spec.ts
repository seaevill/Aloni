import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mountViewGallery } from './fixtures/z5-route';

for (const width of [320, 375]) {
  test(`isolated crop views meet the visual and axe checks at ${width}px`, async ({ page, baseURL }, testInfo) => {
    await page.setViewportSize({ width, height: 812 });
    await mountViewGallery(page, baseURL!);
    await expect(page.getByTestId('tips-card')).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    const result = await page.evaluate(() => {
      const components = [...document.querySelectorAll('main *')];
      const rgb = (colour: string) => colour.match(/[\d.]+/g)?.map(Number) ?? [];
      const opaque = (colour: number[]) => colour.length === 3 || colour[3] === 1;
      const channel = (x: number) => x / 255 <= .04045 ? x / 255 / 12.92 : ((x / 255 + .055) / 1.055) ** 2.4;
      const lum = (c: number[]) => channel(c[0]) * .2126 + channel(c[1]) * .7152 + channel(c[2]) * .0722;
      const failed = [];
      let samples = 0;
      for (const element of components) {
        if (![...element.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())) continue;
        if (!element.getBoundingClientRect().height) continue;
        const fg = rgb(getComputedStyle(element).color);
        let parent: Element | null = element;
        let bg: number[] = [];
        while (parent) {
          bg = rgb(getComputedStyle(parent).backgroundColor);
          if (opaque(bg)) break;
          parent = parent.parentElement;
        }
        if (!opaque(bg) || !opaque(fg)) { failed.push(element.textContent); continue; }
        const a = lum(fg); const b = lum(bg);
        if ((Math.max(a, b) + .05) / (Math.min(a, b) + .05) < 7) failed.push(element.textContent);
        samples++;
      }
      return { failed, samples, width: document.documentElement.scrollWidth };
    });
    expect(result.width).toBeLessThanOrEqual(width);
    expect(result.samples).toBeGreaterThan(0);
    expect(result.failed).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`codex-gallery-${width}.png`), fullPage: true });
  });
}
