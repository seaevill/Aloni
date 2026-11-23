import { expect, test } from './helpers/test';

// Χωράφι › «Κοπή / καθαρισμός»: one record (method + day) starts the «νέα βλάστηση: ημέρα N» counter and appears in the parcel's timeline. Kept on this phone, and it says so.
test('a cut with the shredder two days ago: the counter says day 2, the timeline has the cut, it survives a reload, undo removes it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').filter({ hasText: 'Νότιος Κάμπος' }).click();          // a Demo parcel with no cut recorded

  await expect(page.getByTestId('cut-none')).toBeVisible();
  await expect(page.getByTestId('cut-local')).toContainText('μόνο σε αυτό το τηλέφωνο');
  await page.getByTestId('cut-open').click();
  await page.getByTestId('cut-method-shredder').click();
  await page.getByTestId('cut-day').fill('2026-11-21');
  await page.getByTestId('cut-save').click();
  await expect(page.getByTestId('cut-last')).toContainText('καταστροφέας');
  await expect(page.getByTestId('cut-sprout')).toHaveText('νέα βλάστηση: ημέρα 2');
  await expect(page.getByTestId('timeline-event').filter({ hasText: 'Κοπή (καταστροφέας)' })).toHaveCount(1);

  await page.reload();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').filter({ hasText: 'Νότιος Κάμπος' }).click();
  await expect(page.getByTestId('cut-sprout')).toHaveText('νέα βλάστηση: ημέρα 2');

  await page.getByTestId('cut-undo').click();
  await expect(page.getByTestId('cut-none')).toBeVisible();
  await expect(page.getByTestId('parcel-cut')).not.toContainText(/ασφαλ/i);
});
