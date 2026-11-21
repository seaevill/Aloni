import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// DetailSheet: the shared bottom sheet. Handle, 24 px top corners, soft shadow, heading 20/800 with the crop drawing, a 56 px close button; Back, Escape, the scrim and a pull on the handle close it; it slides up once (not under reduced motion);
// the address carries it (#/own/today/sheet/<kind>/<id>) so a reload or a link comes back; an unknown sheet says WHY it is empty.
test('gallery sheet: look, facts with their reasons, and every way to close it', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await page.getByTestId('sheet-open').click();
  const sheet = page.locator('.ds-sheet');
  await expect(sheet).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));     // measure after the slide-up: sizes taken mid-slide are off by a hair
  const look = await sheet.evaluate((e) => { const cs = getComputedStyle(e); return { tl: cs.borderTopLeftRadius, tr: cs.borderTopRightRadius, bl: cs.borderBottomLeftRadius, shadow: cs.boxShadow !== 'none' }; });
  expect(look).toEqual({ tl: '24px', tr: '24px', bl: '0px', shadow: true });
  expect(await sheet.locator('.ds-sheet-handle').evaluate((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])).toEqual([40, 4]);
  expect(await sheet.locator('h2').evaluate((e) => [parseFloat(getComputedStyle(e).fontSize), getComputedStyle(e).fontWeight])).toEqual([20, '800']);
  await expect(sheet.locator('.ds-sheet-icon svg[data-crop="spinach"]')).toBeVisible();
  expect((await page.getByTestId('sheet-close').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await expect(sheet.locator('.ds-fact[data-known="no"]')).toContainText('δεν έχει καταγραφεί');   // unknown is written with its reason
  await expect(sheet.locator('h2')).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('ds-sheet-open'))).toBe(true);
  await page.keyboard.press('Escape');                                                      // 1. Escape
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('ds-sheet-open'))).toBe(false);
  await page.getByTestId('sheet-open').click(); await page.getByTestId('sheet-close').click(); await expect(sheet).toHaveCount(0);   // 2. the close button
  await page.getByTestId('sheet-open').click(); await page.mouse.click(10, 10); await expect(sheet).toHaveCount(0);                  // 3. the scrim
  await page.getByTestId('sheet-open').click();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));     // the slide-up is over: the handle is where it will stay
  const h = (await page.getByTestId('sheet-handle').boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + 8); await page.mouse.down(); await page.mouse.move(h.x + h.width / 2, h.y + 120); await page.mouse.up();   // 4. a pull down on the handle
  await expect(sheet).toHaveCount(0);
  await page.getByTestId('sheet-open').click(); await page.goBack(); await expect(sheet).toHaveCount(0);                                // 5. Back
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('the sheet slides up once; under reduced motion nothing moves', async ({ page }) => {
  await page.goto('/?ds-gallery');
  await page.getByTestId('sheet-open').click();
  const run = await page.evaluate(() => document.getAnimations().map((a) => ({ name: (a as CSSAnimation).animationName, ms: Number(a.effect?.getComputedTiming().duration), loops: a.effect?.getComputedTiming().iterations })));
  const slide = run.find((a) => a.name === 'ds-sheet');
  expect(slide?.ms).toBe(280); expect(slide?.loops).toBe(1);
  await expect(page.locator('.ds-sheet h2')).toBeFocused();      // the sheet's effects have run (key listener attached): under load an Escape pressed earlier is ignored
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('sheet-scrim')).toHaveCount(0);      // closing goes through the history stack: wait until it is really gone before opening again
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('sheet-open').click();
  const reduced = await page.evaluate(() => document.getAnimations().map((a) => ({ transform: (a.effect as KeyframeEffect).getKeyframes().some((k) => 'transform' in k), ms: Number(a.effect?.getComputedTiming().duration) })));
  expect(reduced.some((a) => a.transform)).toBe(false);
  for (const a of reduced) expect(a.ms).toBeLessThanOrEqual(120);
});

test('deep link: a cold start on a sheet address opens it; an unknown sheet says why; closing clears the address', async ({ page }) => {
  await iphone(page);
  await page.goto('/#/own/today/sheet/crop/abc-123');
  await page.reload();
  const nf = page.getByTestId('sheet-notfound');
  await expect(nf).toBeVisible();
  await expect(nf).toContainText('Δεν βρέθηκε');
  await expect(nf).toContainText('λείπουν τα δεδομένα');
  expect(await page.evaluate(() => location.hash)).toBe('#/own/today/sheet/crop/abc-123');
  await page.getByTestId('sheet-close').click();
  await expect(nf).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/own/today');
});
