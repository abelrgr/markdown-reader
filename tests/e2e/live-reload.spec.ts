import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('automatically reloads updates, shows deletions, and recovers recreated files', async ({
  page,
}) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Título' })).toBeVisible();
  await page.evaluate(() => window.__e2e.writeFile('/fx/basic.md', '# Cambiado'));
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Cambiado' })).toBeVisible();
  await page.evaluate(() => window.__e2e.deleteFile('/fx/basic.md'));
  await expect(page.getByText('File not available')).toBeVisible();
  await page.evaluate(() => window.__e2e.writeFile('/fx/basic.md', '# Recreado'));
  await expect(page.getByTestId('viewer').getByRole('heading', { name: 'Recreado' })).toBeVisible();
});

test('preserves scroll position and tab while reloading a modified document', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  const viewer = page.getByTestId('viewer');
  await viewer.evaluate((element) => {
    element.scrollTop = 800;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(() => viewer.evaluate((element) => element.scrollTop)).toBe(800);
  await page.waitForTimeout(250);
  await page.evaluate(() =>
    window.__e2e.writeFile('/fx/headings.md', '# Updated\n\n' + 'Text.\n\n'.repeat(100)),
  );
  await expect(viewer.getByRole('heading', { name: 'Updated' })).toBeVisible();
  await expect.poll(() => viewer.evaluate((element) => element.scrollTop)).toBe(800);
  await expect(page.getByTestId('tab')).toHaveCount(1);
});

test('saves and restores tabs, order, active tab and scroll position', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md', '/fx/basic.md'] });
  await page.getByTestId('tab').first().getByRole('button').first().click();
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await page.getByTestId('viewer').evaluate((element) => {
    element.scrollTop = 500;
  });
  await page.waitForTimeout(250);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.__E2E_STARTUP__ = [];
  });
  await page.reload();
  await expect(page.getByTestId('tab')).toHaveCount(2);
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await expect
    .poll(() => page.getByTestId('viewer').evaluate((element) => element.scrollTop))
    .toBe(500);
});

test('does not restore a saved session when disabled', async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('settings', JSON.stringify({ restoreSession: false })),
  );
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'session',
      JSON.stringify({
        tabs: [{ path: '/fx/basic.md', scrollTop: 0 }],
        activePath: '/fx/basic.md',
      }),
    ),
  );
  await openApp(page);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
