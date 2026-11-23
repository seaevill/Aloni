import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('the owner\'s bell says «Ανέλαβε …» when a worker takes a job that was open on the board', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await expect(page.getByTestId('bell')).toBeVisible();
  await expect(page.getByTestId('bell-count')).toHaveCount(0);                 // nothing taken yet: the open job was seen open
  await page.waitForTimeout(500);                                               // the first look is stored
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-take').first().click();
  await expect(page.getByTestId('worker-free-job')).toHaveCount(0);
  await page.getByTestId('worker-exit').click();
  await page.locator('nav.tabs [data-tab="today"]').click();
  await expect(page.getByTestId('bell-count')).toHaveText('1');
  await page.getByTestId('bell').click();
  await expect(page.getByTestId('sheet-notices').getByTestId('notice')).toContainText('Ανέλαβε');
});
