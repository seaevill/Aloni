import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('Orders: a four-week comparison per crop next to the dispatch (ordered crates per week, «—» where nothing is ordered)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00Z'));
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  const cell = async (): Promise<number> => {
    await page.locator('nav.tabs [data-tab="more"]').click();
    await page.getByTestId('open-orders').click();
    const row = page.getByTestId('fourweeks-row').filter({ hasText: 'Μαϊντανός' });
    const text = (await row.getByTestId('fourweeks-cell').nth(1).innerText().catch(() => '—')).replace(',', '.');
    await page.getByTestId('orders').getByRole('button').first().click().catch(() => undefined);
    return text === '—' ? 0 : Number.parseFloat(text);
  };
  const before = await cell();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-customers').click();
  await page.getByTestId('customer-add').click();
  await page.getByTestId('customer-name').fill('Μαρία Παπά');
  await page.getByTestId('customer-save').click();
  await page.getByTestId('customer').filter({ hasText: 'Μαρία Παπά' }).click();
  await page.getByTestId('order-crop-parsley').click();
  await page.getByTestId('order-crates').fill('12');
  await page.getByTestId('order-day').fill('2026-11-24');                    // next week
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('order-saved')).toBeVisible();
  await page.getByTestId('customer-back').click();
  await page.getByTestId('customers-back').click();
  await page.getByTestId('open-orders').click();
  const table = page.getByTestId('fourweeks');
  await expect(table).toBeVisible();
  await expect(table.getByTestId('fourweeks-head')).toHaveCount(4);
  const row = table.getByTestId('fourweeks-row').filter({ hasText: 'Μαϊντανός' });
  await expect(row.getByTestId('fourweeks-cell')).toHaveCount(4);
  const after = Number.parseFloat((await row.getByTestId('fourweeks-cell').nth(1).innerText()).replace(',', '.'));
  expect(after - before).toBe(12);                                            // exactly the new order, added to the week of 23 Nov
  await expect(table).not.toContainText(/ασφαλ/i);
});
