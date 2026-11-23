import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test.use({ viewport: { width: 375, height: 812 } });

test('Άλλα → Εργάτες: a name opens the card (name, surname, phone, no birth date) and what is saved stays', async ({ page }) => {
  await iphone(page);
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-workers').click();
  await page.getByTestId('worker-name').fill('Γιώργος');
  await page.getByTestId('worker-add').click();
  await page.getByTestId('worker-open').first().click();
  const card = page.getByTestId('worker-card');
  await expect(card).toBeVisible();
  await expect(card).not.toContainText(/γέννηση|doğum|birth/i);
  await card.getByTestId('wcard-surname').fill('Παπαδόπουλος');
  await card.getByTestId('wcard-phone').fill('6911111111');
  await card.getByTestId('wcard-save').click();
  await expect(card.getByTestId('wcard-saved')).toBeVisible();
  await card.getByTestId('sheet-close').click();
  await page.getByTestId('worker-open').first().click();
  await expect(page.getByTestId('wcard-phone')).toHaveValue('6911111111');
});
