import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './helpers/test';
import { eachScreen, iphone } from './helpers/iphone';

// UX bar (every screen × el/tr/en × empty/demo): no sideways scroll, tap targets >= 56 × 44 px, text >= 14 px, no serious axe issue.
test('UX bar and accessibility on every screen', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await iphone(page);
  const failures: string[] = [];
  await eachScreen(page, async ({ lang, route, state }) => {
    const at = `${state}/${lang}/${route}`;
    const found = await page.evaluate(() => {
      const out: string[] = [];
      const visible = (e: Element) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      if (document.documentElement.scrollWidth > 375) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
      for (const e of document.querySelectorAll('button, a, input, select, [role=button]')) {
        const r = e.getBoundingClientRect();
        if (visible(e) && (r.height < 56 || r.width < 44)) out.push(`target ${e.tagName} ${Math.round(r.width)}×${Math.round(r.height)} "${(e.textContent ?? '').trim().slice(0, 20)}"`);
      }
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (el && (n.textContent ?? '').trim() && visible(el) && parseFloat(getComputedStyle(el).fontSize) < 14) out.push(`font ${getComputedStyle(el).fontSize} "${(n.textContent ?? '').trim().slice(0, 20)}"`);
      }
      return out;
    });
    failures.push(...found.map((f) => `${at}: ${f}`));
    const axe = await new AxeBuilder({ page }).analyze();
    failures.push(...axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${at}: axe ${v.id} (${v.impact})`));
  });
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
