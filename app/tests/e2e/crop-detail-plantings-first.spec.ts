import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

// is-8: on a crop's page the owner first asks «where is this crop and how is it doing», so its plantings come before the tips, pace and seed cards.
test('the crop detail shows its plantings above the tips, pace and seed cards', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Σπανάκι' }).click();

  const detail = page.getByTestId('crop-detail');
  await expect(detail.getByTestId('detail-planting')).toHaveCount(2);
  await page.screenshot({ fullPage: true, path: process.env.SHOT ?? 'test-results/crop-detail.png' });
  const top = async (id: string) => (await detail.getByTestId(id).first().boundingBox())!.y;
  const firstPlanting = await top('detail-planting');
  for (const id of ['crop-tips-open', 'crop-pace', 'crop-guide-open']) {
    expect(firstPlanting, `plantings must start above ${id}`).toBeLessThan(await top(id));
  }
  // the planting count is the heading of that same group, so it comes first of all
  expect(await top('tap-number')).toBeLessThan(firstPlanting);
  // nothing was lost: every old control is still on the page
  await expect(detail.getByTestId('crop-tips-open')).toBeVisible();
  await expect(detail.getByTestId('crop-guide-open')).toBeVisible();
  await expect(detail.getByTestId('detail-lastspray').or(detail.getByTestId('detail-nospray'))).toHaveCount(1);
});
