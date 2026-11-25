import { expect, test } from '@playwright/test';
import { iphone } from './helpers/iphone';
import { setup, spray } from './helpers/farm';

// The four optional spray fields (water, note, growth stage, prescription number) sit under «Περισσότερα στοιχεία (προαιρετικά)»: closed when empty, open as soon as one holds something or reports an error.
// Everything required (planting, product, worker, start, dose, unit, label checks) is untouched and stays in the main form.
test('spray form: optional fields are folded away, open by a tap, kept when typed, and the record saves with or without them', async ({ page }) => {
  const errors = await iphone(page);
  await setup(page, true);
  await spray(page);
  const more = page.getByTestId('spray-more');
  await expect(more).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('spray-bbch')).toBeHidden();
  await more.locator('summary').click();
  for (const id of ['spray-bbch', 'spray-prescription']) await expect(page.getByTestId(id)).toBeVisible();
  await expect(more.locator('input.input')).toHaveCount(4);                         // water, note, growth stage, prescription
  await page.getByTestId('spray-bbch').fill('1');                                   // one digit: refused with its own message, the folded block stays open
  await page.getByTestId('spray-save').click();
  await expect(more).toHaveAttribute('open', '');
  await expect(page.getByText('δύο ψηφία').first()).toBeVisible();
  await page.getByTestId('spray-bbch').fill('12');
  await page.getByTestId('spray-prescription').fill('A-77');
  await page.getByTestId('spray-save').click();
  await expect(page.getByTestId('spray-saved')).toBeVisible();
  expect(errors).toEqual([]);
});
