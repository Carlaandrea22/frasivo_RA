import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  use: { baseURL: process.env.FRASIVO_TEST_URL ?? 'http://127.0.0.1:4175', channel: 'chrome', headless: true },
  webServer: process.env.FRASIVO_TEST_URL ? undefined : { command: 'npm run preview -- --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
});
