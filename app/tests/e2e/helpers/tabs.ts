import type { Page } from '@playwright/test';

/** Αποθήκη is not in the bottom bar (is-7): it opens from the Άλλα menu. */
export async function openStock(page: Page): Promise<void> {
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-stock').click();
}

/** Any bottom-bar tab; «stock» goes through Άλλα. */
export const goTab = (page: Page, id: string): Promise<void> => (id === 'stock' ? openStock(page) : page.locator(`nav.tabs [data-tab="${id}"]`).click());
