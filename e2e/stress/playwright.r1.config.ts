import { defineConfig, devices } from '@playwright/test'

/**
 * R1-B extra probes (uncommitted audit code): configurations and full-motion
 * scenarios the H0 matrix does not cover. Files end in `.r1.ts`, so the
 * stress matrix and the main e2e config never pick them up.
 *
 *   E2E_BASE_URL=http://localhost:3100 STRESS_OUT=<dir> \
 *     npx playwright test -c e2e/stress/playwright.r1.config.ts
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.r1\.ts$/,
  outputDir: '../../test-results/stress-r1',
  timeout: 20 * 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    colorScheme: 'dark',
    testIdAttribute: 'data-viz-part',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
