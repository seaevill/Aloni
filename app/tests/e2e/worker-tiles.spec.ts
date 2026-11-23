import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('worker tabs are big tiles: an icon above a short label, at least 72 px tall, and they answer a press', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  for (const id of ['jobs', 'harvest', 'observe']) {
    const tab = page.getByTestId(`worker-tab-${id}`);
    await expect(tab.locator('svg')).toHaveCount(1);
    expect((await tab.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(72);
  }
  const tab = page.getByTestId('worker-tab-harvest');
  await tab.hover();
  await page.mouse.down();
  await expect(tab).toHaveCSS('transform', /matrix/);          // pressed: slightly smaller (the :active rule), never a layout shift
  await page.mouse.up();
});
