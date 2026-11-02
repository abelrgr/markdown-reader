import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('searches the open folder and opens a hit at its Markdown source line', async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  await page.evaluate(() => {
    window.__e2e.setFolderResult('/fx');
    window.__e2e.emitOpenPaths(['/fx/headings.md']);
  });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+Shift+O');
  await page.keyboard.press('ControlOrMeta+Shift+F');
  await page.getByRole('textbox', { name: 'Search text in folder' }).fill('Uso');
  const result = page.getByTestId('search-result').filter({ hasText: 'headings.md:3' });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await expect(page.locator('#uso')).toBeInViewport();
});

test('only shows results for the latest debounced query', async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  await page.evaluate(() => {
    window.__e2e.setFolderResult('/fx');
    window.__e2e.searchDelayMs = { Uso: 500, Markdown: 10 };
    window.__e2e.emitOpenPaths(['/fx/basic.md']);
  });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+Shift+O');
  await page.keyboard.press('ControlOrMeta+Shift+F');
  const input = page.getByRole('textbox', { name: 'Search text in folder' });
  await input.fill('Uso');
  await page.waitForTimeout(350);
  await input.fill('Markdown');
  await expect(page.getByTestId('search-result').first()).toContainText('basic.md', {
    timeout: 1_000,
  });
  await page.waitForTimeout(550);
  await expect(page.getByTestId('search-result').first()).toContainText('basic.md');
  await expect(page.getByTestId('search-result')).toHaveCount(1);
});
