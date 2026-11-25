import { expect, test } from '@playwright/test';

// Queue item 5: the parcel detail opens with its three key facts (area, harvest wait, last spray) above the sketch; every other card stays.
for (const width of [320, 375, 390]) {
  test(`parcel detail shows area, harvest wait and last spray first at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
    await page.goto('/');
    await page.getByTestId('empty-state').locator('button').nth(1).click();
    await expect(page.getByTestId('today-counts')).toBeVisible();
    await page.locator('nav.tabs [data-tab="parcels"]').click();
    await page.getByTestId('parcel-sketch-open').filter({ hasText: 'Κάτω Κάμπος' }).click();
    const detail = page.getByTestId('parcel-detail');
    const key = detail.getByTestId('detail-key');
    await expect(key).toBeVisible();
    await expect(key).toContainText('Εμβαδόν');
    await expect(key.getByTestId('detail-cut')).toHaveText(/^Κοπή/);
    await expect(key).toContainText('Τελευταίος ψεκασμός');
    await expect(key.getByTestId('detail-key-spray')).not.toBeEmpty();
    const keyBox = await key.boundingBox();
    const sketchBox = await detail.getByTestId('parcel-sketch').boundingBox();
    expect(keyBox && sketchBox && keyBox.y < sketchBox.y).toBe(true);
    expect((keyBox?.y ?? 999) + (keyBox?.height ?? 999)).toBeLessThanOrEqual(740);
    // nothing lost: the remaining facts, the full spray list, timeline and actions are still on the page
    for (const label of ['Τοπογραφία', 'Υψόμετρο', 'Κωδικός ΟΣΔΕ', 'Τελευταίοι ψεκασμοί']) await expect(detail).toContainText(label);
    await expect(detail.getByTestId('detail-weather')).toBeVisible();
    await expect(detail.getByTestId('timeline')).toBeAttached();
    await expect(detail.getByTestId('analysis-open')).toBeAttached();
    await expect(detail.getByText('Εμβαδόν', { exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
