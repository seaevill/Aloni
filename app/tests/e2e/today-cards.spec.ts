import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

// UX1 step 2 (docs/milestones/UX1.md): on Σήμερα the plantings that are free to cut are folded into ONE line when there are many, so the ones that need attention (waiting period running, unknown) come first and are never hidden.
// Presentation only: the same rows, the same states; nothing is removed and nothing is decided here.
test('many «free to cut» rows fold into one line; the rows that need attention stay visible; the folded rows open on a tap', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();                    // the demo farm
  const group = page.getByTestId('cut-free-group');
  await expect(group).toBeVisible();
  await expect(group.locator('summary')).toContainText(/\d/);                                // «N plantings free to cut»
  const attention = page.locator('[data-testid="cut"]:not([data-state="free"])');
  const nAttention = await attention.count();
  for (let i = 0; i < nAttention; i += 1) await expect(attention.nth(i)).toBeVisible();      // nothing that needs attention is folded away
  const free = page.locator('[data-testid="cut"][data-state="free"]');
  await expect(free.first()).toBeHidden();                                                    // folded
  await group.locator('summary').click();
  expect(await free.count()).toBeGreaterThan(3);
  await expect(free.first()).toBeVisible();                                                   // one tap shows every one of them
});
