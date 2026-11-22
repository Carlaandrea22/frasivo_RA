import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4175);

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    trace: process.env.CI ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.platform === 'linux' || process.env.CI
      ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : undefined,
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
