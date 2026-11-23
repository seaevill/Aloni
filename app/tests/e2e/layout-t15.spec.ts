import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// T15: the five tab labels never overlap (375 and 320 px), no button word is cut in the middle, and the area «3,5 στρ.» stays on one line.
for (const width of [375, 320]) {
  test(`tab labels do not overlap at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    const errors = await iphone(page);
    await expect(page.locator('nav.tabs .lbl')).toHaveCount(5);
    const boxes = await page.locator('nav.tabs .lbl').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, e.scrollWidth, e.clientWidth]; }));
    expect(boxes.length).toBe(5);
    for (let i = 1; i < boxes.length; i += 1) expect(boxes[i][0]).toBeGreaterThanOrEqual(boxes[i - 1][1]);
    for (const b of boxes) expect(b[2]).toBeLessThanOrEqual(b[3] + 1); // the label fits its box (long words break at their soft hyphen)
    expect(errors).toEqual([]);
  });
}
test('number and unit stay together', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  const t = await page.getByTestId('parcel-open').first().innerText();
  expect(t).toMatch(/\d στρ\./);
});

test('at 300 px the buttons stack in one column; the stock filter is one scrollable row', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 700 });
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  const cols = await page.locator('main .seg').first().evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(1);
  await page.locator('nav.tabs [data-tab="stock"]').click();
  const f = page.locator('.filters').first();
  if ((await f.count()) > 0) expect(await f.evaluate((e) => getComputedStyle(e).flexWrap)).toBe('nowrap');
});
