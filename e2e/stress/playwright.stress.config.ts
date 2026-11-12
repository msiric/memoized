import { defineConfig, devices } from '@playwright/test'

/**
 * VIZ-H H0-B stress matrix: rendering-correctness detectors over every width,
 * zoom, preset, step and adversarial fixture. Runs against a dev server that
 * is already up (E2E_BASE_URL, default http://localhost:3100) started with
 * VIZ_GALLERY=1 or in dev mode.
 *
 *   E2E_BASE_URL=http://localhost:3100 STRESS_OUT=<dir> \
 *     npx playwright test -c e2e/stress/playwright.stress.config.ts
 *
 * STRESS_CONFIGS=w320,w1280 limits the matrix. Specs never fail on findings
 * unless STRESS_STRICT=1 (then any finding fails its test): H0 records, H4 gates.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.stress\.ts$/,
  outputDir: '../../test-results/stress-pw',
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
