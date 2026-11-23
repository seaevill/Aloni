import { expect, test } from './helpers/test';

// Εργασίες › «Επαναλαμβανόμενες»: written once, it shows its next day, and on its weekday it is on the worker screen of the same phone. Kept on the phone, and says so.
test('a Monday rule: «Κάθε Δευ», the next day, it comes back after a reload, and the worker screen shows it today (a Monday)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));          // a Monday in Athens
  await page.goto('/');
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.getByTestId('tasks-counts').evaluate((el) => (el as HTMLElement).click());        // «Εργασίες»
  const box = page.getByTestId('recurring');
  await expect(box.getByTestId('rec-rule')).toHaveCount(2);                       // the Demo's two examples (Monday field check, Friday store cleaning)
  await expect(box.getByTestId('rec-local')).toContainText('μόνο σε αυτό το τηλέφωνο');
  await box.getByTestId('rec-add').click();
  await box.getByTestId('rec-day-1').click();
  await box.getByTestId('rec-title').fill('Έλεγχος χωραφιού');
  await box.getByTestId('rec-save').click();
  await expect(box.getByTestId('rec-rule')).toHaveCount(3);
  await expect(box.getByTestId('rec-rule').last()).toContainText('Κάθε Δευ');
  await expect(box.getByTestId('rec-rule').last()).toContainText('Έλεγχος χωραφιού');
  await expect(box.getByTestId('rec-next').last()).toContainText('Δευ 23 Νοε');
  await page.reload();
  await page.getByTestId('tasks-counts').evaluate((el) => (el as HTMLElement).click());        // «Εργασίες»
  await expect(page.getByTestId('recurring').getByTestId('rec-rule')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await expect(page.getByTestId('worker-app')).toBeVisible();
  await expect(page.getByTestId('rec-today-item')).toHaveText(['Έλεγχος χωραφιού', 'Έλεγχος χωραφιού']);         // the Demo's Monday example and the one just added
});
