import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('manual update check shows an install action', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Open file…' })).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.update = { version: '9.9.9', notes: 'x' };
    window.dispatchEvent(new CustomEvent('app:about'));
  });
  await page.getByRole('button', { name: 'Check for updates…' }).click();
  await expect(page.getByTestId('toast')).toContainText('9.9.9');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByTestId('toast').getByRole('button', { name: 'Update', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__e2e.updateInstallCalled)).toBe(true);
});
