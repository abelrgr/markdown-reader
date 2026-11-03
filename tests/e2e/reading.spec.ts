import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('reading themes, custom CSS, focus mode and image lightbox', async ({ page }) => {
  await openApp(page, { startup: ['/fx/Mis Notas - Café/images.md'] });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByLabel('Reading theme').selectOption('sepia');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-reading-theme', 'sepia');
  await page.getByLabel('Custom CSS').fill('article h1 { color: rgb(255, 0, 0) }');
  await expect(page.locator('article h1')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.keyboard.press('F11');
  await expect(page.locator('.app-shell')).toHaveClass(/focus-mode/);
  await expect(page.locator('.tabbar')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-shell')).not.toHaveClass(/focus-mode/);
  await page.getByTestId('viewer').getByRole('img').first().click();
  await expect(page.locator('.image-lightbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.image-lightbox')).not.toBeVisible();
});
