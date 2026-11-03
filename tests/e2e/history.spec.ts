import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('back/forward navigation and bookmarks persist', async ({ page }) => {
  await openApp(page, { startup: ['/fx/basic.md'] });
  const initialScroll = await page.getByTestId('viewer').evaluate((element) => element.scrollTop);
  await page.getByRole('link', { name: 'a headings' }).click();
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await expect(page.locator('#uso')).toBeInViewport();

  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page).toHaveTitle('basic.md — Markdown Reader');
  await expect(page.getByTestId('viewer')).toHaveJSProperty('scrollTop', initialScroll);
  await page.keyboard.press('Alt+ArrowRight');
  await expect(page).toHaveTitle('headings.md — Markdown Reader');
  await expect(page.locator('#uso')).toBeInViewport();

  await page.keyboard.press('ControlOrMeta+d');
  await page.getByRole('tab', { name: 'Bookmarks' }).click();
  await expect(page.getByRole('navigation', { name: 'Bookmarks' })).toContainText('Uso');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('bookmarks')))
    .toContain('Uso');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('session')))
    .toContain('headings.md');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Bookmarks' })).toBeVisible();
  await page.getByRole('tab', { name: 'Bookmarks' }).click();
  await expect(page.getByRole('navigation', { name: 'Bookmarks' })).toContainText('Uso');
});
