import { expect, test } from './helpers/test';
import { setup } from './helpers/farm';
import { iphone } from './helpers/iphone';

// UX1 (docs/milestones/UX1.md), step 1: the spraying form reads as numbered STEPS and each step shows when it is done («✓»), so the person sees at a glance what is still missing.
// Presentation only: nothing here decides anything; the waiting-period gate and every required field are unchanged.
test('the spraying form shows numbered steps that turn «done» as the farmer chooses', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await page.getByTestId('spray-open').click();
  const steps = page.locator('h2.step');
  await expect(steps).toHaveCount(4);                                                       // planting, product, who sprayed, dose and unit (the lot step only appears after a product with lots)
  for (let i = 0; i < 4; i += 1) await expect(steps.nth(i)).toHaveAttribute('data-done', 'no');
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await expect(steps.nth(0)).toHaveAttribute('data-done', 'yes');
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await expect(steps.nth(1)).toHaveAttribute('data-done', 'yes');
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await expect(steps.nth(2)).toHaveAttribute('data-done', 'yes');
  await expect(steps.nth(3)).toHaveAttribute('data-done', 'no');                            // no dose and unit yet
  const marker = await steps.nth(0).evaluate((h) => getComputedStyle(h, '::before').content);
  expect(marker).toContain('✓');                                                            // the done mark is drawn by the stylesheet, not typed into the Greek text
  const todo = await steps.nth(3).evaluate((h) => getComputedStyle(h, '::before').content);
  expect(todo).not.toContain('✓');
});
