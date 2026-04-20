import { defineConfig, devices } from '@playwright/test';

const headed = process.env.PLAYWRIGHT_HEADED === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    headless: !headed,
    viewport: null,
    launchOptions: {
      args: headed
        ? ['--disable-dev-shm-usage', '--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        : ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1600, height: 1200 },
      },
    },
  ],
});
