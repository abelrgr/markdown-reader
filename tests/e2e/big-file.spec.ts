import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openApp } from './helpers';

test('renders a large document without blocking the interface', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  const largeDocument = await readFile(resolve('tests/e2e/generated/big.md'), 'utf8');
  await page.evaluate((content) => window.__e2e.writeFile('/fx/big.md', content), largeDocument);
  expect(await page.evaluate(() => window.__e2e.hasFile('/fx/big.md'))).toBe(true);

  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/code.md']));
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.getByTestId('tab-close').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();

  const renderStartedAt = Date.now();
  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/big.md']));
  await new Promise((resolve) => setTimeout(resolve, 50));
  const startedAt = Date.now();
  await page.keyboard.press('ControlOrMeta+,');
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 250 });
  expect(Date.now() - startedAt).toBeLessThan(300);
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('viewer')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('toc-item').first()).toContainText('Section 0', {
    timeout: 12_000,
  });
  expect(Date.now() - renderStartedAt).toBeLessThan(8_000);

  const tocNav = page.getByTestId('sidebar').locator('nav');
  await tocNav.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByTestId('toc-item').last()).toContainText('Section 19999');
  expect(await page.getByTestId('toc-item').count()).toBeLessThan(100);
});
