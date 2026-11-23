import { expect, test } from './helpers/test';
import { setup, spray } from './helpers/farm';
import { fixClock } from './helpers/clock';
import { iphone } from './helpers/iphone';

// UX1 step 3: «Χρονολόγιο» shows recorded parcel events newest first, across Athens day boundaries.
for (const [wallClock, now, sown, timezoneId] of [
  ['23:30', '2026-11-20T21:30:00Z', '2026-11-20', 'Europe/Athens'],
  ['00:30', '2026-11-20T22:30:00Z', '2026-11-21', 'Europe/Athens'],
  ['00:30', '2026-11-20T22:30:00Z', '2026-11-21', 'UTC'],
]) {
  test.describe(timezoneId + ' at ' + wallClock, () => {
    test.use({ timezoneId });
    test(`the parcel detail lists sowing, spraying and harvest in one stream, newest first at ${wallClock} Athens`, async ({ page }) => {
      await fixClock(page, now);
      await iphone(page);
      await setup(page, true);
      await spray(page);
      await page.getByTestId('spray-save').click();
      await expect(page.getByTestId('spray-save')).toBeHidden();
      await page.locator('nav.tabs [data-tab="parcels"]').click();
      await page.getByTestId('parcel-open').first().click();
      const stream = page.getByTestId('timeline');
      await expect(stream).toBeVisible();
      const events = stream.getByTestId('timeline-event');
      await expect(events).toHaveCount(2); // the spraying and the sowing of the one planting
      const kinds = await events.evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')));
      expect(kinds).toEqual(['spray', 'sown']);
      const ats = await events.evaluateAll((els) => els.map((e) => e.getAttribute('data-at') ?? ''));
      expect(ats).toEqual([now, sown]);
      // This fixture is in winter, when Athens local midnight is UTC+02:00.
      const times = ats.map((at, i) => Date.parse(kinds[i] === 'sown' ? `${at}T00:00:00+02:00` : at));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });
  });
}
