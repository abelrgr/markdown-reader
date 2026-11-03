import { expect, test } from '@playwright/test';
import { openApp, openViaDialog } from './helpers';

test('renders untrusted HTML safely', async ({ page }) => {
  await openApp(page, { startup: ['/fx/xss.md'] });
  await expect.poll(() => page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('external links are opened externally without navigating the reader', async ({ page }) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  await page.getByRole('link', { name: 'External link' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__e2e.openedUrls))
    .toContain('https://example.com');
  await expect(page).toHaveURL(/localhost:5174/);
});

test('markdown document links open a tab and navigate to its anchor', async ({ page }) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  await page.getByRole('link', { name: 'a headings' }).click();
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await expect(page.locator('#uso')).toBeInViewport();
});

test('internal anchors navigate within the document', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await page.getByRole('link', { name: 'ir' }).click();
  await expect(page.locator('#introducción')).toBeInViewport();
});

test('resolves local images and adds code copy buttons', async ({ page }) => {
  await openApp(page, { startup: ['/fx/images.md'] });
  await expect
    .poll(() =>
      page
        .locator('[data-testid="viewer"] img')
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  await openViaDialog(page, ['/fx/code.md']);
  await expect(page.getByTestId('viewer').locator('pre')).toHaveCount(4);
  await expect(page.getByTestId('viewer').locator('button.copy-code')).toHaveCount(4);
});

test('resolves a local image whose relative path contains spaces and accents', async ({ page }) => {
  await openApp(page, { startup: ['/fx/Mis Notas - Café/images.md'] });
  const image = page.getByTestId('viewer').getByRole('img', { name: 'Local café icon' });
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBe(1);
});

test('renders valid Mermaid and keeps invalid diagram source visible', async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.evaluate(() => window.__e2e.openPathsReady)).toBe(true);
  expect(await page.evaluate(() => window.__e2e.hasFile('/fx/mermaid.md'))).toBe(true);
  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/mermaid.md']));
  const viewer = page.getByTestId('viewer');
  await expect(viewer).toContainText('The rest of this document should remain visible.');
  await expect(viewer.locator('.mermaid-block').first().locator('svg')).toBeVisible();
  const invalid = viewer.locator('[data-testid="mermaid-error"]');
  await expect(invalid).toContainText('not a valid diagram');
  await expect(invalid.locator('pre code')).toHaveText('this is not a valid diagram');
  await expect(invalid).toContainText('Diagram could not be rendered');

  const diagram = viewer.locator('.mermaid-block').first().locator('svg');
  const lightSvg = await diagram.evaluate((svg) => svg.outerHTML);
  await page.keyboard.press('ControlOrMeta+,');
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect.poll(() => diagram.evaluate((svg) => svg.outerHTML)).not.toBe(lightSvg);
});
