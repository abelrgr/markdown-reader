import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('quick open searches the active folder and opens a selected document', async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  await page.evaluate(() => {
    window.__e2e.setFolderResult('/fx');
    window.__e2e.emitOpenPaths(['/fx/basic.md']);
  });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+Shift+O');
  await page.keyboard.press('ControlOrMeta+p');
  await page.getByRole('textbox', { name: 'Quick open' }).fill('head');
  await page.keyboard.press('Enter');
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
});

test('quick open falls back to tabs and recents; command palette runs commands', async ({
  page,
}) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+p');
  await expect(page.getByRole('textbox', { name: 'Quick open' })).toBeVisible();
  await expect(page.getByTestId('quick-open-item')).toContainText('basic.md');
  await page.keyboard.press('Escape');

  await page.keyboard.press('ControlOrMeta+Shift+p');
  await page.getByRole('textbox', { name: 'Command palette' }).fill('dark');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
