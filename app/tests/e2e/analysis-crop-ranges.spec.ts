import { expect, test } from './helpers/test';
import { fixClock } from './helpers/clock';

test('a pH reading lists, per crop of that parcel, the general literature range WITH its source, or says there is no source', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  const reading = page.getByTestId('analysis-ph-source').first();
  await expect(reading).toBeVisible();
  await reading.click();
  const detail = page.getByTestId('analysis-explain');
  const ranges = detail.getByTestId('analysis-crop-range');
  await expect(ranges.first()).toBeVisible();
  for (const text of await ranges.allInnerTexts()) expect(text).toMatch(/University|δεν υπάρχει πηγή/);
  await expect(detail.getByTestId('analysis-crop-ranges')).toContainText('Πληροφοριακό, χωρίς υπογραφή γεωπόνου');
  await expect(detail.getByTestId('analysis-crop-ranges')).not.toContainText(/ασφαλ/i);
});

test('an EC reading lists the same crops, each with «δεν υπάρχει πηγή» (no sourced EC range exists), under the unsigned note', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('onboarding_seen', '1'));
  await page.route('**/*', (route) => { const url = new URL(route.request().url()); return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? route.continue() : route.abort(); });
  await fixClock(page);
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  await page.getByTestId('analysis-open').click();
  await page.getByTestId('analysis-ec-source').first().click();
  const box = page.getByTestId('analysis-explain').getByTestId('analysis-crop-ranges');
  await expect(box).toBeVisible();
  for (const text of await box.getByTestId('analysis-crop-range').allInnerTexts()) expect(text).toContain('δεν υπάρχει πηγή');
  await expect(box).toContainText('Πληροφοριακό, χωρίς υπογραφή γεωπόνου');
});

