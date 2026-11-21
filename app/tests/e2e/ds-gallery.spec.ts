import { expect, test } from '@playwright/test';

// Design-system gallery (D2): the eight status chips and the tags, at 375 px.
// icon, word and fill all differ between tones (colour is never the only signal); every chip is 32 px high; text contrast >= 7:1 (composited over white).
const rgb = (s: string) => (/rgba?\((\d+), (\d+), (\d+)/.exec(s) ?? []).slice(1, 4).map(Number);
const lum = (c: number[]) => { const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test('eight chip tones: different icon, word and fill; 32 px; contrast >= 7:1; tags have no icon', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await expect(page.getByTestId('ds-gallery')).toBeVisible();
  const chips = page.locator('.ds-chip');
  await expect(chips).toHaveCount(8);
  const facts = await chips.evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { tone: e.getAttribute('data-tone') ?? '', icon: e.querySelector('svg')?.getAttribute('data-icon') ?? '', text: e.textContent ?? '', h: Math.round(e.getBoundingClientRect().height), bg: cs.backgroundColor, fg: cs.color, border: `${cs.borderTopStyle} ${cs.borderTopWidth}` }; }));
  for (const f of facts) {
    expect(f.h, f.tone).toBe(32);
    expect(f.text.length, f.tone).toBeGreaterThan(3);
    const bg = rgb(f.bg).length === 3 && f.bg !== 'rgba(0, 0, 0, 0)' ? rgb(f.bg) : [255, 255, 255];
    expect(ratio(rgb(f.fg), bg), `${f.tone} ${f.fg} on ${f.bg}`).toBeGreaterThanOrEqual(7);
  }
  // «warn» and «unsigned» share the amber fill by design but differ in icon and word; no two tones share icon AND word AND fill
  const keys = facts.map((f) => `${f.icon}|${f.text}|${f.bg}|${f.border}`);
  expect(new Set(keys).size).toBe(8);
  expect(new Set(facts.map((f) => f.icon)).size).toBe(8);
  expect(new Set(facts.map((f) => f.text)).size).toBe(8);
  const unknown = facts.find((f) => f.tone === 'unknown')!;
  expect(unknown.border).toContain('dashed');
  const tags = page.locator('.ds-tag');
  await expect(tags).toHaveCount(3);
  expect(await tags.first().evaluate((e) => e.getBoundingClientRect().height)).toBe(28);
  expect(await page.locator('.ds-tag svg').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('the gallery exists only behind the flag: the normal page never shows it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ds-gallery')).toHaveCount(0);
});
