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
    // ── Desktop browsers ───────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1600, height: 1200 },
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1600, height: 1200 },
        // Firefox ignores the global launchOptions.args — no extra flags needed
        launchOptions: {},
      },
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1600, height: 1200 },
        launchOptions: {},
      },
    },

    // ── Mobile devices (touch + small viewport) ───────────────────────────────
    {
      // Android Chrome on Pixel 5
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        },
      },
      // Only run specs tagged with @mobile or the dedicated cross-browser spec
      testMatch: /cross-browser\.spec\.ts|responsive-board\.spec\.ts|portrait-rod-drag\.spec\.ts/,
    },
    {
      // iPhone 13 — iOS Safari simulation via WebKit
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        launchOptions: {},
      },
      testMatch: /cross-browser\.spec\.ts|responsive-board\.spec\.ts|portrait-rod-drag\.spec\.ts/,
    },
    {
      // iPad Pro 11 landscape — Safari simulation
      name: 'tablet-safari',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'webkit',
        viewport: { width: 1194, height: 834 },
        launchOptions: {},
      },
      testMatch: /cross-browser\.spec\.ts|smoke\.spec\.ts/,
    },
  ],
});
