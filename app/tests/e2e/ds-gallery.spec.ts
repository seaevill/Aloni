import { expect, test } from '@playwright/test';

// Design-system gallery (D2): the eight status chips and the tags, at 375 px.
// icon, word and fill all differ between tones (colour is never the only signal); every chip is 32 px high; text contrast >= 7:1 (composited over white).
const rgb = (s: string) => (/rgba?\((\d+), (\d+), (\d+)/.exec(s) ?? []).slice(1, 4).map(Number);
const lum = (c: number[]) => { const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test('eight chip tones: different icon, word and fill; 32 px; contrast >= 7:1; tags have no icon', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await expect(page.getByTestId('ds-gallery')).toBeVisible();
  const chips = page.locator('[data-testid="gallery-chips"] .ds-chip');
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

// D3: surfaces. Two elevations only: no card inside a card; rows are flat (no shadow, no own background) with a hairline divider and >= 56 px; the big title is on the sage page; the glass bar appears only after the page scrolls.
test('surfaces: no nested cards, flat 56 px rows, hero is forest, title on sage, glass bar after scroll', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await expect(page.getByTestId('gallery-card')).toBeVisible();
  expect(await page.locator('.ds-card .ds-card, .ds-card .ds-hero, .ds-hero .ds-card').count()).toBe(0);
  const rows = await page.locator('.ds-row').evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { h: Math.round(e.getBoundingClientRect().height), shadow: cs.boxShadow, bg: cs.backgroundColor, divider: cs.borderBottomWidth }; }));
  expect(rows.length).toBe(4);
  for (const r of rows) { expect(r.h).toBeGreaterThanOrEqual(56); expect(r.shadow).toBe('none'); expect(r.bg).toBe('rgba(0, 0, 0, 0)'); }
  expect(rows[0]!.divider).toBe('1px');
  expect(rows[3]!.divider).toBe('0px');                                                  // the last row of a card has no divider
  const hero = await page.getByTestId('ds-hero').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(hero).toBe('rgb(11, 53, 37)');
  const titleBg = await page.locator('.ds-title').evaluate((e) => { let n: Element | null = e; while (n && getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)') n = n.parentElement; return n ? getComputedStyle(n).backgroundColor : ''; });
  expect(titleBg).toBe('rgb(245, 242, 233)');                                           // sage page, not a forest band
  const bar = page.getByTestId('ds-topbar');
  await expect(bar).toHaveAttribute('data-shown', 'no');
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(bar).toHaveAttribute('data-shown', 'yes');
  expect(await bar.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute('data-shown', 'no');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

// D4: data viz. null is never 0; [3,null,5] draws two segments (here two lone dots); held/unknown supply is hatched, labelled and never part of the eligible bar; a missing weather day says «άγνωστο» once.
test('data viz: unknown is not zero, gaps break the line, hatched unknown is separate, short/extra in words', async ({ page }) => {
  await page.goto('/?ds-gallery');
  const nums = page.locator('.ds-bignum');
  await expect(nums).toHaveCount(3);
  await expect(nums.nth(0).locator('.ds-bignum-value')).toHaveText('12 κλούβες');
  expect(await nums.nth(0).locator('.ds-bignum-value').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(44);
  await expect(nums.nth(1).locator('.ds-bignum-value')).toHaveText('άγνωστο');           // missing: never 0, never a dash
  expect(await nums.nth(1).locator('.ds-bignum-value').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(22);
  await expect(nums.nth(2).locator('.ds-bignum-value')).toHaveText('0');                  // a real zero stays a zero
  expect(await nums.nth(2).locator('.ds-bignum-value').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(22);
  const sparks = page.locator('.ds-spark');
  await expect(sparks.nth(0).locator('circle.ds-spark-solo')).toHaveCount(2);              // [3, null, 5]: two segments, no line across the gap
  await expect(sparks.nth(0).locator('polyline')).toHaveCount(0);
  await expect(sparks.nth(1).locator('polyline')).toHaveCount(1);
  await expect(sparks.nth(1).locator('circle.ds-spark-end')).toHaveCount(1);
  await expect(sparks.nth(1).locator('figcaption')).toHaveText('Κλούβες 7 ημ.');           // the line never stands alone
  expect(await sparks.nth(1).locator('svg').evaluate((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height])).toEqual([120, 32]);
  const weeks = page.getByTestId('week');
  await expect(weeks).toHaveCount(4);
  await expect(weeks.nth(0).getByTestId('week-delta')).toContainText('▼ λείπουν 20 κλούβες');   // 100 ordered, 80 eligible: the 20 unknown crates do NOT cover it
  await expect(weeks.nth(0).getByTestId('week-unknown')).toBeVisible();
  const eligibleW = await weeks.nth(0).getByTestId('week-eligible').evaluate((e) => e.getBoundingClientRect().width);
  const trackW = await weeks.nth(0).locator('.ds-week-track').evaluate((e) => e.getBoundingClientRect().width);
  expect(eligibleW / trackW).toBeCloseTo(0.8, 1);                                         // the bar is 80 of 100: the hatched 20 is not added
  await expect(weeks.nth(1).getByTestId('week-delta')).toContainText('▲ περισσεύουν 20 κλούβες');
  await expect(weeks.nth(2).getByTestId('week-delta')).toHaveCount(0);                     // no orders and no eligible number: nothing is claimed
  await expect(weeks.nth(3).getByTestId('week-delta')).toContainText('καλύπτει ακριβώς');
  const rows = page.locator('[data-testid="ds-weather"] tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toHaveAttribute('data-known', 'no');
  await expect(rows.nth(1).locator('td')).toHaveCount(1);                                  // «άγνωστο» ONCE for the whole day
  await expect(rows.nth(1)).toContainText('άγνωστο');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

// D6: 17 crop drawings, decorative (aria-hidden), at tile size and hero size; the crop name is printed beside each; a neutral leaf for an unknown slug is in CropIcon.
test('17 crop illustrations: aria-hidden, sized, one fill colour and one stroke colour', async ({ page }) => {
  await page.goto('/?ds-gallery');
  const rows = page.locator('.gallery-crop');
  await expect(rows).toHaveCount(17);
  const svgs = page.locator('.gallery-crop svg.ds-crop');
  await expect(svgs).toHaveCount(34);
  for (const hidden of await svgs.evaluateAll((els) => els.map((e) => e.getAttribute('aria-hidden')))) expect(hidden).toBe('true');
  const sizes = await svgs.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(sizes)).toEqual(new Set([40, 96]));
  const paint = await page.locator('.ds-crop-fill').first().evaluate((e) => { const cs = getComputedStyle(e); return [cs.fill, cs.stroke]; });
  expect(paint).toEqual(['rgb(234, 248, 196)', 'rgb(11, 53, 37)']);
  await expect(rows.first()).toContainText('Σπανάκι');
});

// D7: the mark (12 stones + disc) and the wordmark (name from config; the Latin name only when asked for).
test('brand: the ring mark has 12 stones, the wordmark shows the configured name, Latin only in store contexts; the static splash exists', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await expect(page.locator('[data-testid="gallery-brand"] svg.ds-mark rect')).toHaveCount(12);
  await expect(page.locator('[data-testid="gallery-brand"] .ds-wordmark-el')).toHaveText('Αλώνι');
  await expect(page.locator('[data-testid="gallery-brand"] .ds-wordmark-latin')).toHaveText('Aloni');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json() as { theme_color: string; icons: Array<{ purpose?: string }> };
  expect(manifest.theme_color).toBe('#134a2b');
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
});

// D8: eight empty states: a 160 px drawing, a 20/800 headline, one sentence and ONE 56 px action.
test('eight empty states: 160 px art, 20/800 headline, one action of at least 56 px, art is decorative', async ({ page }) => {
  await page.goto('/?ds-gallery');
  const states = page.locator('[data-testid="gallery-empty"] .empty');
  await expect(states).toHaveCount(8);
  const arts = await page.locator('[data-testid="gallery-empty"] svg.ds-empty-art').evaluateAll((els) => els.map((e) => ({ art: e.getAttribute('data-art'), w: Math.round(e.getBoundingClientRect().width), hidden: e.getAttribute('aria-hidden') })));
  expect(arts.map((a) => a.art)).toEqual(['parcels', 'plantings', 'stock', 'register', 'jobs', 'orders', 'offline', 'photos']);
  for (const a of arts) { expect(a.w).toBe(160); expect(a.hidden).toBe('true'); }
  for (let i = 0; i < 8; i++) {
    const s = states.nth(i);
    await expect(s.locator('button')).toHaveCount(1);                                      // one action only
    expect((await s.locator('button').boundingBox())!.height).toBeGreaterThanOrEqual(56);
    expect(await s.locator('h2').evaluate((e) => [parseFloat(getComputedStyle(e).fontSize), getComputedStyle(e).fontWeight])).toEqual([20, '800']);
  }
});

// D10: motion confirms, never asks for attention. Check-draw 280 ms and roll 200 ms with their tokens; under reduced motion no transform animation runs and fades last at most 120 ms; the check exists only after the commit.
const anims = (page: import('@playwright/test').Page) => page.evaluate(() => document.getAnimations().map((a) => ({ name: (a as CSSAnimation).animationName ?? '', ms: Number(a.effect?.getComputedTiming().duration), transform: (a.effect as KeyframeEffect).getKeyframes().some((k) => 'transform' in k), loops: a.effect?.getComputedTiming().iterations })));
test('motion: check-draw and roll with the token durations, never a loop; the check appears only after the commit', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await expect(page.getByTestId('check-draw')).toHaveCount(0);                        // nothing animates before the action is committed
  await page.getByTestId('motion-commit').click();
  await expect(page.getByTestId('check-draw')).toBeVisible();
  const running = await anims(page);
  const check = running.find((a) => a.name === 'ds-check-draw'); const roll = running.find((a) => a.name === 'ds-roll');
  expect(check?.ms).toBe(280); expect(roll?.ms).toBe(200);
  expect(running.every((a) => a.loops === 1)).toBe(true);                             // no loop anywhere
});
test('reduced motion: no transform animation, every fade at most 120 ms, no press scale', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?ds-gallery');
  await page.getByTestId('motion-commit').click();
  await expect(page.getByTestId('check-draw')).toBeVisible();
  const running = await anims(page);
  expect(running.length).toBeGreaterThan(0);
  expect(running.some((a) => a.transform)).toBe(false);
  for (const a of running) expect(a.ms).toBeLessThanOrEqual(120);
  expect(await page.getByTestId('motion-commit').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
});

// WebKit refuses a CSS var() inside an SVG width/height ATTRIBUTE and logs an error that fails every console check: sizes go by class (ds/size.ts).
test('no SVG anywhere carries a width or height attribute with var()', async ({ page }) => {
  await page.goto('/?ds-gallery');
  expect(await page.evaluate(() => [...document.querySelectorAll('svg')].filter((s) => /var\(/.test(`${s.getAttribute('width')} ${s.getAttribute('height')}`)).length)).toBe(0);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  expect(await page.evaluate(() => [...document.querySelectorAll('svg')].filter((s) => /var\(/.test(`${s.getAttribute('width')} ${s.getAttribute('height')}`)).length)).toBe(0);
});
