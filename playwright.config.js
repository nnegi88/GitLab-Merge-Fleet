import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Stop the whole run in CI before the 20-minute job timeout, so Playwright
  // still prints its error summary and writes the HTML report
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry is enough to flag flaky tests; more multiplies the cost of real failures
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:4000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Mobile viewport testing (optional, commented out for now)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Test a production build. The dev server compiles each lazy-loaded route on
  // its first visit, which stalled first visits for 30s+ in CI; a built app
  // serves everything precompiled, as users get it.
  webServer: {
    command: 'npm run build && npx vite preview --port 4000 --strictPort',
    url: 'http://localhost:4000/GitLab-Merge-Fleet/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
