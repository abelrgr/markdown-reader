import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('opens a folder, navigates its file tree, and saves the folder to recents', async ({
  page,
}) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/basic.md']));
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.evaluate(() => window.__e2e.setFolderResult('/fx'));
  await page.keyboard.press('ControlOrMeta+Shift+O');

  await expect(page.getByRole('tab', { name: 'Files' })).toBeVisible();
  await page.getByRole('tab', { name: 'Files' }).click();
  await expect(page.getByTestId('file-tree')).toBeVisible();
  await expect(page.getByTestId('file-tree-file').filter({ hasText: 'basic.md' })).toBeVisible();

  await page.getByTestId('file-tree-file').filter({ hasText: 'headings.md' }).click();
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  while (await page.getByTestId('tab-close').count())
    await page.getByTestId('tab-close').first().click();

  await expect(page.getByTestId('empty-state')).toBeVisible();
  const recentFolder = page.getByTestId('recent-item').filter({ hasText: '📁' });
  await expect(recentFolder).toContainText('fx');
});
