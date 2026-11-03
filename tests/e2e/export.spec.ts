import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('exports the current document as standalone HTML and routes print to the native layer', async ({
  page,
}) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  await page.evaluate(() => {
    window.__e2e.saveResult = 'C:/exports/basic.html';
    window.__e2e.emitOpenPaths(['/fx/basic.md']);
  });
  await expect(page.getByTestId('viewer')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+Shift+E');
  await expect
    .poll(() => page.evaluate(() => window.__e2e.savedFiles?.['C:/exports/basic.html']))
    .toContain('<!doctype html>');
  const exported = await page.evaluate(() => window.__e2e.savedFiles?.['C:/exports/basic.html']);
  expect(exported).toContain('<meta charset="utf-8">');
  expect(exported).toContain('<article');
  expect(exported).not.toContain('<script');

  await page.keyboard.press('ControlOrMeta+Alt+p');
  await expect.poll(() => page.evaluate(() => window.__e2e.printRequested)).toBe(true);
});
