import type { Page } from '@playwright/test';

export async function openApp(page: Page, opts: { startup?: string[] } = {}): Promise<void> {
  await page.addInitScript((startupPaths) => {
    if (sessionStorage.getItem('__e2e-startup-consumed') === 'true') return;
    window.__E2E_STARTUP__ = startupPaths;
    sessionStorage.setItem('__e2e-startup-consumed', 'true');
  }, opts.startup ?? []);
  await page.goto('/');
}

export async function openViaDialog(page: Page, paths: string[]): Promise<void> {
  await page.evaluate((selectedPaths) => window.__e2e.setDialogResult(selectedPaths), paths);
  await page.keyboard.press('ControlOrMeta+O');
}
