import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('finds accent-insensitive text, navigates results, and clears on Escape', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.getByTestId('viewer')).toContainText('Uso');
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })),
  );
  const input = page.getByTestId('find-input');
  await expect(input).toBeFocused();
  await input.fill('Uso');
  await expect(page.getByTestId('find-count')).toHaveText('1/2');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('find-count')).toHaveText('2/2');
  await expect(page.getByTestId('find-current')).toBeInViewport();
  await page.keyboard.press('Shift+Enter');
  await expect(page.getByTestId('find-count')).toHaveText('1/2');
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !CSS.highlights?.has('find'))).toBe(true);
});
