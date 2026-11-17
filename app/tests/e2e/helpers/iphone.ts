import type { Page } from '@playwright/test';

// 375 px WebKit helper: every screen × language × state (empty farm, demo farm). Console errors fail the run.
export const LANGS = ['EL', 'TR', 'EN'] as const;
export const ROUTES = ['today', 'crops', 'parcels', 'stock', 'more', 'info'] as const;
export type Lang = (typeof LANGS)[number];
export type Route = (typeof ROUTES)[number];
export type State = 'empty' | 'demo';

export async function iphone(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${m.text()} ${m.location().url}`); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  return errors;
}

const tab = (page: Page, id: string) => page.locator(`nav.tabs [data-tab="${id}"]`).click();

export async function goTo(page: Page, route: Route): Promise<void> {
  if (route === 'info') { await tab(page, 'more'); await page.locator('main button.btn.secondary').click(); } else await tab(page, route);
}

/** Visits every screen in every language, first with an empty farm, then with the demo farm loaded. */
export async function eachScreen(page: Page, visit: (at: { lang: Lang; route: Route; state: State }) => Promise<void>): Promise<void> {
  for (const state of ['empty', 'demo'] as const) {
    await tab(page, 'today'); // leaves the Information sub-screen (More keeps its state while it stays open)
    if (state === 'demo') { await tab(page, 'more'); await page.locator('main button.btn').first().click(); }
    for (const lang of LANGS) {
      await tab(page, 'today');
      await tab(page, 'more');
      await page.getByRole('button', { name: lang, exact: true }).click();
      for (const route of ROUTES) { await goTo(page, route); await visit({ lang, route, state }); }
    }
  }
}
