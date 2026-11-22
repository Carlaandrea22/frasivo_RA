import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4175',
    channel: 'chrome',
    trace: process.env.CI ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.platform === 'linux' ? { args: ['--enable-unsafe-swiftshader'] } : undefined,
  },
  webServer: {
    command: 'npm run preview -- --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
});
