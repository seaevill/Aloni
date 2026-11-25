import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// D5: the tab bar uses the shared icon set, the crops tab is «Φυτά», and no tab label wraps at 320 px in el, tr or en; the active tab keeps its lime pill.
test.use({ viewport: { width: 320, height: 640 } });
test('tab labels stay on one line at 320 px in every language; icons come from the set; the active pill is lime', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  for (const lang of ['EL', 'TR', 'EN']) {
    await page.getByRole('button', { name: lang, exact: true }).click();
    const labels = await page.locator('nav.tabs .lbl').evaluateAll((els) => els.map((e) => ({ t: e.textContent ?? '', h: Math.round(e.getBoundingClientRect().height), lh: parseFloat(getComputedStyle(e).lineHeight) })));
    expect(labels).toHaveLength(5);
    for (const l of labels) expect(l.h, `${lang} «${l.t}» wraps`).toBeLessThanOrEqual(Math.round(l.lh) + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
  await page.getByRole('button', { name: 'EL', exact: true }).click();
  await expect(page.locator('nav.tabs [data-tab="crops"] .lbl')).toHaveText('Φυτά');
  const icons = await page.locator('nav.tabs svg').evaluateAll((els) => els.map((e) => e.getAttribute('data-icon')));
  expect(icons).toEqual(['today', 'crops', 'parcels', 'stock', 'more']);
  const pill = await page.locator('nav.tabs [aria-current="page"] .ico').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(pill).toBe('rgb(213, 243, 107)');                                           // --lime
});
