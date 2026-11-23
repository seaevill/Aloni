import { expect, test } from './helpers/test';
import { setup } from './helpers/farm';
import { iphone } from './helpers/iphone';

// UX1 step 4 (docs/milestones/UX1-tasks.md): Σήμερα shows the «Εργασίες» hub: one summary line (overdue / today / upcoming / done today) above the groups. Counting only.
test('Σήμερα has the «Εργασίες» heading and a summary line that follows the jobs: a new job moves «σήμερα» from 0 to 1', async ({ page }) => {
  await iphone(page);
  await setup(page, true);
  await expect(page.getByRole('heading', { name: 'Εργασίες' })).toBeVisible();
  const line = page.getByTestId('tasks-counts');
  await expect(line).toHaveText('0 καθυστερημένες · 0 σήμερα · 0 επόμενες · 0 έγιναν σήμερα');
  await page.getByTestId('job-open').click();
  await page.getByRole('button', { name: 'Σπανάκι · Κάτω Κάμπος' }).click();
  await page.getByRole('button', { name: 'Kocide 2000' }).click();
  await page.getByTestId('job-dose-same').click();                                            // the owner taps «same as the label»: nothing is filled in by itself
  await page.getByRole('button', { name: 'Γιώργος' }).click();
  await page.getByTestId('job-save').click();
  await expect(page.getByTestId('job-saved')).toBeVisible();
  await expect(line).toHaveText('0 καθυστερημένες · 1 σήμερα · 0 επόμενες · 0 έγιναν σήμερα');
});
