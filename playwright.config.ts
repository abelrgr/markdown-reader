import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'en-US',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
