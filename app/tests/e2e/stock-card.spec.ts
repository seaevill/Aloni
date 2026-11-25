import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// Αποθήκη product cards (Field Atelier): the ⓘ button sits on the SAME line as the name (it used to take a 56 px row of its own), both still open the product sheet, the balance is the strongest line of the card, every action is still there.
test('Demo Αποθήκη (375 px): name and ⓘ share one line, both open the sheet, the balance is prominent, all card actions remain', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="stock"]').click();
  const card = page.getByTestId('product').first();
  const name = card.getByTestId('product-source-open');
  const info = card.getByTestId('product-info');
  await expect(name).toBeVisible();
  const [a, b] = [await name.boundingBox(), await info.boundingBox()];
  expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(8);                       // one line
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 2);                          // ⓘ to the right of the name
  expect(a!.height).toBeGreaterThanOrEqual(56); expect(b!.height).toBeGreaterThanOrEqual(56); expect(b!.width).toBeGreaterThanOrEqual(56);
  const font = await card.getByTestId('product-stock').evaluate((e) => ({ size: parseFloat(getComputedStyle(e).fontSize), weight: Number(getComputedStyle(e).fontWeight) }));
  expect(font.size).toBeGreaterThanOrEqual(22);                               // heading size
  const [nb, bal, tags] = [await name.boundingBox(), await card.getByTestId('product-stock').boundingBox(), await card.locator('.tags').first().boundingBox()];
  expect(bal!.y).toBeGreaterThan(nb!.y + nb!.height - 2);                      // balance directly under the name…
  expect(bal!.y).toBeLessThan(tags!.y);                                        // …and above the tags, warning and pack size
  expect(font.weight).toBeGreaterThanOrEqual(700);
  for (const id of ['stock-open', 'labeluse-open']) await expect(card.getByTestId(id), id).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await info.click();
  await expect(page.getByTestId('product-source')).toBeVisible();
  await page.getByTestId('product-source').getByTestId('sheet-close').click();
  await name.click();
  await expect(page.getByTestId('product-source')).toBeVisible();
});
