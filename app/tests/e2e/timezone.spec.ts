import { expect, test, type Page } from '@playwright/test';
import { fillStart, setup, spray } from './helpers/farm';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

// The phone is set to Istanbul (+03:00 all year); the farm clock is Europe/Athens. A spray typed as «10:00» is 10:00 in Athens = 08:00 UTC in November.
test.use({ timezoneId: 'Europe/Istanbul' });
const sprayedAt = (page: Page) => page.evaluate(() => new Promise<string[]>((res) => { const r = indexedDB.open('aloni'); r.onsuccess = () => { const q = r.result.transaction('job_spray').objectStore('job_spray').getAll(); q.onsuccess = () => res((q.result as Array<{ sprayed_at: string }>).map((x) => x.sprayed_at)); }; }));

test('a phone set to Istanbul: the time fields start at the Athens clock and a typed time is read as Athens time', async ({ page }) => {
  await fixClock(page);
  await iphone(page);
  await setup(page, true);
  await spray(page);
  const shown = await page.locator('input[type=datetime-local]').nth(1).inputValue();
  expect(shown).toBe('2026-11-20T12:30'); // the farm's Athens wall time
  await page.locator('input[type=datetime-local]').nth(1).fill('2026-11-20T10:00');
  await fillStart(page, '2026-11-20T09:00');
  await page.getByTestId('spray-save').click();
  await expect.poll(() => sprayedAt(page)).toEqual(['2026-11-20T08:00:00Z']); // 10:00 Athens, not 07:00Z (Istanbul)
});
