import { expect, test } from './helpers/test';

// The Demo farm holds the two cases the farmers asked about (fictional, Demo only): parsley with its pace, fertiliser plan and repeating jobs; a field cleared with the shredder («νέα βλάστηση: ημέρα 2»).
test('Demo: parsley has a harvest pace and a fertiliser plan; the cleared field counts new growth; repeating jobs are there', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();

  await page.locator('nav.tabs [data-tab="crops"]').click();
  await page.getByTestId('crop-open').filter({ hasText: 'Μαϊντανός' }).click();
  await expect(page.getByTestId('pace-rate')).toContainText('≈ 3 κλούβες/ημέρα');                    // 54 crates over 18 days (the owner's Demo estimate)
  await expect(page.getByTestId('pace-source')).toHaveText('Πηγή: δική σας εκτίμηση');
  const plan = page.getByTestId('fert-plan').filter({ has: page.getByTestId('fert-item') }).first();
  await expect(plan.getByTestId('fert-item')).toHaveCount(2);
  await expect(plan.getByTestId('fert-item').first()).toContainText('όπως το έγραψε ο γεωπόνος');
  await expect(plan).toContainText('κλειστές');
  await expect(page.getByTestId('crop-detail')).not.toContainText(/ασφαλ/i);

  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').filter({ hasText: 'Κάτω Κάμπος' }).click();
  await expect(page.getByTestId('cut-last')).toContainText('καταστροφέας');
  await expect(page.getByTestId('cut-sprout')).toHaveText('νέα βλάστηση: ημέρα 2');
  await expect(page.getByTestId('water-card')).toBeVisible();
});
