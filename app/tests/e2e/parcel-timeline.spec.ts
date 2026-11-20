import { expect, test } from '@playwright/test';
import { setup, spray } from './helpers/farm';
import { iphone } from './helpers/iphone';

// UX1 step 3 (docs/milestones/UX1.md): the parcel detail gets a «Χρονολόγιο»: ONE read-only stream of sowing, sprayings and harvests, newest first. It shows only what the records say.
test('the parcel detail lists sowing, spraying and harvest in one stream, newest first', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await spray(page);
  await page.getByTestId('spray-save').click();
  await page.locator('nav.tabs [data-tab="parcels"]').click();
  await page.getByTestId('parcel-open').first().click();
  const stream = page.getByTestId('timeline');
  await expect(stream).toBeVisible();
  const events = stream.getByTestId('timeline-event');
  await expect(events).toHaveCount(2);                                                       // the spraying and the sowing of the one planting
  const kinds = await events.evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')));
  expect(kinds).toEqual(['spray', 'sown']);                                                  // newest first: the spraying was recorded after the sowing date
  const ats = await events.evaluateAll((els) => els.map((e) => e.getAttribute('data-at') ?? ''));
  expect([...ats].sort().reverse()).toEqual(ats);
});
