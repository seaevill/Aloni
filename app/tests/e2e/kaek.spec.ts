import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup } from './helpers/farm';

// Χωράφι › «ΚΑΕΚ»: the 12-digit cadastre number, typed by the owner, kept on the phone. FICTIONAL number below; no request leaves the phone; the Demo cannot hold one.
test('a real parcel keeps its ΚΑΕΚ (12 digits only) across a reload; a wrong number is refused; it can be deleted', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') requests.push(u.hostname); });
  await iphone(page);
  await setup(page, true);
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const card = page.getByTestId('kaek-card');
  await expect(card.getByTestId('kaek-none')).toBeVisible();
  await expect(card.getByTestId('kaek-local')).toContainText('μόνο σε αυτό το τηλέφωνο');
  await card.getByTestId('kaek-edit').click();
  await card.getByTestId('kaek-input').fill('12345');
  await expect(card.getByTestId('kaek-error')).toBeVisible();
  await expect(card.getByTestId('kaek-save')).toBeDisabled();
  await card.getByTestId('kaek-input').fill('111111111111');
  await card.getByTestId('kaek-save').click();
  await expect(card.getByTestId('kaek-value')).toHaveText('111111111111');
  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('kaek-value')).toHaveText('111111111111');
  await page.getByTestId('kaek-edit').click();
  await page.getByTestId('kaek-remove').click();
  await expect(page.getByTestId('kaek-none')).toBeVisible();
  expect(requests).toEqual([]);                                                       // nothing was looked up anywhere
});

test('the Demo parcel page has no ΚΑΕΚ entry (real numbers never go into the Demo)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await expect(page.getByTestId('kaek-none')).toBeVisible();
  await expect(page.getByTestId('kaek-edit')).toHaveCount(0);
});
