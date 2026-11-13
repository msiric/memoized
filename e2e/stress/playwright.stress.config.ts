import { defineConfig, devices } from '@playwright/test'

/**
 * VIZ-H stress gate: rendering-correctness detectors over widths, zooms,
 * text sizes, both motion modes, every preset and step (checkpoints answered
 * right, wrong and skipped), hover, print, hydration and the adversarial
 * fixtures. Runs against a dev server that is already up (E2E_BASE_URL,
 * default http://localhost:3100) started with VIZ_GALLERY=1 or in dev mode.
 *
 *   E2E_BASE_URL=http://localhost:3100 \
 *     npx playwright test -c e2e/stress/playwright.stress.config.ts
 *
 * Strict by default: any finding fails its test (STRESS_STRICT=0 only
 * records). STRESS_TIER=pr (default) is the fast PR gate, STRESS_TIER=full
 * the nightly matrix (harness.ts lists both); STRESS_CONFIGS=w320,w1280
 * picks configs by name. Findings JSON and failure screenshots go to
 * STRESS_OUT (default test-results/stress).
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
