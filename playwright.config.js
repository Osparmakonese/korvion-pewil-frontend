// Playwright config for Pewil end-to-end smoke tests.
//
// Run against a deployed environment (staging preferred) — set PEWIL_BASE_URL,
// PEWIL_TEST_EMAIL, PEWIL_TEST_PASSWORD. The test account must NOT have 2FA
// enabled (so login is a single step) and should be a normal cashier/manager on
// a sandbox tenant.
//
//   npm run e2e:install     # one-time: install the chromium browser
//   PEWIL_BASE_URL=https://staging.pewil.org \
//   PEWIL_TEST_EMAIL=smoke@pewil.org PEWIL_TEST_PASSWORD='...' \
//   npm run e2e
//
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.PEWIL_BASE_URL || 'https://staging.pewil.org',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
