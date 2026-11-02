import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test('shows the empty state on startup', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
