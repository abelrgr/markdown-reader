import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('tab navigation, TOC, sidebar, status and metadata', async ({ page }) => {
  await openApp(page, { startup: ['/fx/basic.md', '/fx/code.md', '/fx/headings.md'] });
  const tabs = page.getByTestId('tab');
  await expect(tabs).toHaveCount(3);
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, bubbles: true }),
    ),
  );
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, bubbles: true }),
    ),
  );
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', ctrlKey: true, bubbles: true })),
  );
  await expect(tabs).toHaveCount(2);
  await tabs.first().locator('button').last().click();
  await expect(tabs).toHaveCount(1);

  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/headings.md']));
  await expect(page.getByTestId('toc-item')).toHaveCount(3);
  await page.getByTestId('toc-item').nth(2).click();
  await expect(page.locator('#uso-1')).toBeInViewport();
  await page.getByTestId('viewer').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(page.getByTestId('toc-item-active')).toContainText('Uso');
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true })),
  );
  await expect(page.getByTestId('sidebar')).toBeHidden();
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true })),
  );

  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/basic.md']));
  await expect(page.getByTestId('status-bar')).toContainText('words');
  await expect(page.getByTestId('status-bar')).toContainText('Encoding:');
  await page.evaluate(() => window.__e2e.emitOpenPaths(['/fx/frontmatter.md']));
  await expect(page.getByTestId('meta-card')).toContainText('A title');
});

test('keeps the tab header and status bar fixed while only the document scrolls', async ({
  page,
}) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  const viewer = page.getByTestId('viewer');
  const tabbar = page.getByRole('tablist');
  const statusBar = page.getByTestId('status-bar');
  await expect(viewer).toBeVisible();
  await expect(tabbar).toBeVisible();
  await expect(statusBar).toBeVisible();

  const initial = await page.evaluate(() => ({
    tabTop: document.querySelector('[role="tablist"]')!.getBoundingClientRect().top,
    statusBottom: document.querySelector('[data-testid="status-bar"]')!.getBoundingClientRect()
      .bottom,
    viewportHeight: window.innerHeight,
  }));
  await viewer.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect.poll(() => viewer.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(tabbar).toBeVisible();
  await expect(statusBar).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        windowScrollY: window.scrollY,
        documentScrollHeight: document.documentElement.scrollHeight,
        documentClientHeight: document.documentElement.clientHeight,
        tabTop: document.querySelector('[role="tablist"]')!.getBoundingClientRect().top,
        statusBottom: document.querySelector('[data-testid="status-bar"]')!.getBoundingClientRect()
          .bottom,
      })),
    )
    .toEqual({
      windowScrollY: 0,
      documentScrollHeight: initial.viewportHeight,
      documentClientHeight: initial.viewportHeight,
      tabTop: initial.tabTop,
      statusBottom: initial.statusBottom,
    });
});
