import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

// Every badge (the red «αναμονή έως…» pill on a cut card, the green signed one, the amber and grey ones) carries a DRAWN icon (a mask), not a text glyph: a «×» in a red pill looked like a close button.
test.use({ viewport: { width: 375, height: 812 } });
test('badges draw their icon instead of printing a text glyph', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  const blocked = page.locator('.badge.blocked').first();
  await expect(blocked).toBeVisible();
  for (const sel of ['.badge.blocked', '.badge.unsigned', '.badge.neutral']) {
    const el = page.locator(sel).first();
    if (!(await el.count())) continue;
    const st = await el.evaluate((e) => { const c = getComputedStyle(e, '::before'); return { content: c.content, mask: c.getPropertyValue('mask-image') || c.getPropertyValue('-webkit-mask-image'), w: parseFloat(c.width) }; });
    expect(['""', 'none', 'normal'], `${sel} prints a glyph: ${st.content}`).toContain(st.content);
    expect(st.mask, `${sel} has no drawn icon`).toContain('svg');
    expect(st.w).toBeGreaterThan(8);
  }
  expect((await blocked.innerText()).trim()).not.toMatch(/^[✕×✓ⓘ◔]/);                  // no glyph in the text either
});
