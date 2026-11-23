import { expect, test } from './helpers/test';
import { setup, spray } from './helpers/farm';
import { iphone } from './helpers/iphone';

// The waiting ring: a RUNNING wait (signed label) shows days left and percent elapsed; an UNKNOWN wait (unsigned label) shows no ring and says why; both open the «Αναμονή» sheet from the cut card.
test.use({ viewport: { width: 375, height: 812 } });

test('signed label: the cut card has a small ring; its sheet shows the big ring, the dates, the source and the official-label note; no dose advice anywhere', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  const card = page.getByTestId('cut').first();
  await expect(card).toHaveAttribute('data-state', 'from');
  if (process.env.SHOTS) await page.screenshot({ path: '../docs/design/compare/sprint/cc-wait-card.png' });
  const small = card.getByTestId('wait-ring');
  await expect(small).toBeVisible();
  const days = Number(await small.getAttribute('data-days'));
  expect(days).toBeGreaterThan(0);                                                       // the signed label has a real waiting period
  expect(Number(await small.getAttribute('data-percent'))).toBeGreaterThanOrEqual(0);
  await card.click();
  const sheet = page.getByTestId('sheet-wait');
  await expect(sheet).toBeVisible();
  const big = sheet.getByTestId('wait-ring');
  await expect(big).toHaveAttribute('data-size', 'lg');
  expect(Number(await big.getAttribute('data-days'))).toBe(days);                       // the card and the sheet say the same
  expect(await big.locator('svg').evaluate((e) => e.getBoundingClientRect().width)).toBe(160);
  expect(await big.locator('.ds-ring-days').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(44);   // BigNum size
  await expect(big.locator('.ds-ring-pct')).toContainText('%');
  if (process.env.SHOTS) await page.screenshot({ path: '../docs/design/compare/sprint/cc-wait-sheet.png' });
  expect(await big.locator('.ds-ring-fill').evaluate((e) => getComputedStyle(e).stroke)).toBe('rgb(19, 74, 43)');    // forest
  expect(await big.locator('.ds-ring-track').evaluate((e) => getComputedStyle(e).stroke)).toBe('rgb(234, 248, 196)');  // lime-soft
  await expect(sheet.locator('.ds-chip')).toContainText('Κοπή από');
  await expect(sheet).toContainText('Τελευταίος ψεκασμός');
  await expect(sheet).toContainText('ετικέτα προϊόντος (υπογεγραμμένη)');
  await expect(sheet).toContainText('δεν κονταίνει ποτέ μια αναμονή');
  const body = await sheet.innerText();
  expect(body).not.toMatch(/ασφαλ|safe/i);                                              // never «safe»
  expect(body).not.toMatch(/ml\/στρ|δόση/i);                                             // no dose written by the app
  await sheet.getByRole('button', { name: 'Σελίδα καλλιέργειας' }).click();
  await expect(page.getByTestId('sheet-crop')).toBeVisible();
});

test('unsigned label: no ring anywhere; the sheet says why the wait is unknown and that it does not count as free', async ({ page }) => {
  await iphone(page);
  await setup(page, false);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  const card = page.getByTestId('cut').first();
  await expect(card).toHaveAttribute('data-state', 'unknown');
  await expect(card.getByTestId('wait-ring')).toHaveCount(0);
  await card.click();
  const sheet = page.getByTestId('sheet-wait');
  await expect(sheet.getByTestId('wait-ring')).toHaveCount(0);
  await expect(sheet.locator('.ds-chip')).toContainText('άγνωστη');
  await expect(sheet.getByTestId('sheet-why')).toContainText('δεν μετράει ως ελεύθερο');
});

test('a card that is free to cut opens its crop, not the wait sheet; the wait sheet address survives a reload', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('cut').first().click();
  await expect(page.getByTestId('sheet-crop')).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await page.getByTestId('cut').first().click();
  await expect(page.getByTestId('sheet-wait')).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/sheet/wait/');
  await page.reload();
  await expect(page.getByTestId('sheet-wait')).toBeVisible();
});
