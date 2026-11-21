import { expect, test } from '@playwright/test';
import { fixClock } from './helpers/clock';

test('Demo records can be filtered by Latin transliteration or accentless Greek', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await page.locator('nav.tabs [data-tab="crops"]').click();
  const search = page.getByRole('searchbox', { name: 'Αναζήτηση' });
  await expect(search).toBeVisible();
  expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(56);
  await search.fill('maintanos');
  await expect(page.getByTestId('crop-open')).toHaveCount(1);
  await expect(page.getByTestId('crop-open')).toContainText('Μαϊντανός');
  await search.fill('no matching record');
  await expect(page.getByText('Δεν βρέθηκε όνομα που να ταιριάζει.')).toBeVisible();

  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await search.fill('παχη');
  await expect(page.getByTestId('parcel-open')).toHaveCount(1);
  await expect(page.getByTestId('parcel-open')).toContainText('Πάχη');
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
