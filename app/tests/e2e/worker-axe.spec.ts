import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './helpers/test';
import { iphone } from './helpers/iphone';

test('worker jobs, observations and harvest meet the axe gate in Hindi at 375 px', async ({ page }) => {
  await iphone(page);
  await page.getByTestId('empty-state').locator('button').nth(1).click();
  await expect(page.getByTestId('today-counts')).toBeVisible();
  await page.locator('nav.tabs [data-tab="more"]').click();
  await page.getByTestId('open-worker-view').click();
  await page.getByTestId('worker-lang').getByRole('button', { name: 'हिन्दी' }).click();
  await expect(page.getByTestId('hi-review')).toBeVisible();

  const failures: string[] = [];
  for (const tab of ['jobs', 'observe', 'harvest']) {
    const button = page.getByTestId(`worker-tab-${tab}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const { violations } = await new AxeBuilder({ page }).analyze();
    for (const violation of violations) {
      if (violation.impact === 'critical' || violation.impact === 'serious') {
        failures.push(`${tab}: ${violation.id} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`);
      }
    }
  }
  expect(failures).toEqual([]);
});
