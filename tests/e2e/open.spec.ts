import { expect, test } from '@playwright/test';
import { openApp, openViaDialog } from './helpers';

test('opens a document from the dialog and updates the window title', async ({ page }) => {
  await openApp(page);
  await openViaDialog(page, ['/fx/basic.md']);
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Título' })).toBeVisible();
  await expect(page).toHaveTitle('basic.md — Markdown Reader');
});

test('drop opens multiple documents in order and activates the last', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.__e2e.drop(['/fx/basic.md', '/fx/code.md']));
  await expect(page.getByTestId('viewer')).toContainText('hola_mundo');
  await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);
  await expect(page).toHaveTitle('code.md — Markdown Reader');
});

test('opens startup paths and ignores duplicate open-path events', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Introducción' })).toBeVisible();
  await openViaDialog(page, ['/fx/basic.md']);
  await page.evaluate(() => {
    window.__e2e.emitOpenPaths(['/fx/basic.md']);
    window.__e2e.emitOpenPaths(['/fx/basic.md']);
  });
  await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);
});

test('restores a saved document and its scroll position', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('session', JSON.stringify({
    tabs: [{ path: '/fx/headings.md', scrollTop: 800 }],
    activePath: '/fx/headings.md',
  })));
  await openApp(page);
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Introducción' })).toBeVisible();
  await expect.poll(() => page.getByTestId('viewer').evaluate((element) => element.scrollTop)).toBe(800);
});

test('shows localized open errors without creating a tab', async ({ page }) => {
  await openApp(page);
  await openViaDialog(page, ['/fx/no-existe.md']);
  await expect(page.getByTestId('toast')).toContainText('File not found');
  await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
});

test('closed documents remain in recents and can be reopened', async ({ page }) => {
  await openApp(page);
  await openViaDialog(page, ['/fx/basic.md']);
  await page.getByRole('button', { name: 'Close basic.md' }).click();
  const recent = page.getByTestId('recent-item').filter({ hasText: 'basic.md' });
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Título' })).toBeVisible();
});

test('system theme follows OS color-scheme changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('drop overlay follows native drag enter and leave events', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.__e2e.dragOver(true));
  await expect(page.getByTestId('drop-overlay')).toBeVisible();
  await page.evaluate(() => window.__e2e.dragOver(false));
  await expect(page.getByTestId('drop-overlay')).toHaveCount(0);
});

test('uses the Spanish UI language when selected in settings', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('settings', JSON.stringify({ language: 'es' })));
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Abrir archivo…' })).toBeVisible();
});
