import type { Page } from '@playwright/test';
import { athensDateTime, TEST_NOW, DAY_MS } from '../../helpers/clock';

export const fixClock = (page: Page, instant = TEST_NOW) => page.clock.setFixedTime(new Date(instant));

export const installClock = (page: Page, instant = TEST_NOW) => page.clock.install({ time: new Date(instant) });

export async function athensInput(page: Page, offsetMs = 0): Promise<string> {
  return athensDateTime(await page.evaluate(() => Date.now()) + offsetMs);
}

export const advanceDays = (page: Page, days: number) =>
  page.clock.setSystemTime(Date.parse(TEST_NOW) + days * DAY_MS);
