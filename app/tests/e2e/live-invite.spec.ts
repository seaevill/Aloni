import { expect, test } from './helpers/test';
import { Server, mockFor, ownerInvitesWorker } from './helpers/mock-server';

// E4: the owner shows a QR code (and a copyable link) for a worker; it opens the app in the worker's language, Hindi unless the owner picks another. The link carries only the language.
test.use({ viewport: { width: 375, height: 812 } });

test('the invitation sheet shows a QR code and a link that carries only the language; the language buttons change the link', async ({ page }) => {
  const srv = new Server();
  await mockFor(page, srv, 'owner', 'bora@example.org');
  await ownerInvitesWorker(page, srv);
  await page.locator('[data-testid="worker"]').filter({ hasText: 'Γιώργος' }).getByTestId('invite-qr-open').click();
  const sheet = page.getByTestId('sheet-invite');
  await expect(sheet.getByTestId('invite-for')).toContainText('Γιώργος');
  await expect(sheet.getByTestId('invite-qr')).toBeVisible();
  const box = (await sheet.getByTestId('invite-qr').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(200); expect(box.width).toBeLessThanOrEqual(300); expect(Math.abs(box.width - box.height)).toBeLessThan(2);   // big enough to scan, square
  await expect(sheet.getByTestId('invite-link')).toHaveValue(/\/\?lang=hi$/);                          // Hindi first
  expect(await sheet.getByTestId('invite-link').inputValue()).not.toMatch(/worker@example|Γιώργος|farm/); // nothing personal in it
  const modulesHi = await sheet.getByTestId('invite-qr').locator('path').getAttribute('d');
  await sheet.getByTestId('invite-lang').getByRole('button', { name: /EL/ }).click();
  await expect(sheet.getByTestId('invite-link')).toHaveValue(/\/\?lang=el$/);
  await expect.poll(async () => sheet.getByTestId('invite-qr').locator('path').getAttribute('d')).not.toBe(modulesHi); // the code follows the link (the picture is redrawn a moment after the field)
  expect((await sheet.getByTestId('invite-copy').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await sheet.getByTestId('invite-copy').click();
  await expect(sheet.getByTestId('invite-copied').or(sheet.getByRole('alert'))).toBeVisible();          // copied, or (no permission) the plain «press and hold» help
  await expect(sheet.getByTestId('invite-note')).toContainText('δεν δίνει πρόσβαση');                   // honest: the link alone lets nobody in
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId('sheet-close').click();
  await expect(sheet).toHaveCount(0);
});
