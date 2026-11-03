import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('settings, theme, font size, remote images, shortcuts and About', async ({ page }) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true, bubbles: true })),
  );
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Font size').fill('20');
  await expect(page.locator('article')).toHaveCSS('font-size', '20px');
  await page.getByLabel('Block remote images').check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/images.md']));
  await expect(page.locator('[data-blocked-src]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('F1');
  await expect(page.getByRole('dialog')).toContainText('Keyboard shortcuts');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:about')));
  await expect(page.getByTestId('about-dialog')).toContainText('2.0.0-beta.1');
});
