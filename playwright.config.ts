import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end checks for lesson visualizations (VIZ-01 spec §7) and the
 * permanent quality gates (VIZ-H G). CI runs them (.github/workflows/ci.yml,
 * job "Visualization gates"); `e2e/gate.sh` runs the same commands locally.
 *
 * Projects:
 * - functional: e2e/viz-*.spec.ts, behavior, layout, axe, no-JS, console.
 * - gates: e2e/gates/contrast.spec.ts, the computed-style contrast crawl (at
 *   rest and in full motion), and e2e/gates/consistency.spec.ts (equivalent
 *   elements across visuals, frames against the lesson's code blocks).
 * - visual: e2e/gates/visual.spec.ts, screenshot baselines; runs only in the
 *   Playwright Linux image (VIZ_VISUAL=1), see `yarn test:viz:visual`.
 * - motion: e2e/motion/*.spec.ts, the strict motion gate (MOTION_STRICT=0
 *   only records). The R1 audit probes (e2e/motion/r1) and the evidence
 *   strips are not gates and are ignored here.
 * The stress matrix has its own config (e2e/stress/playwright.stress.config.ts).
 *
 * Server, in order of precedence:
 * - E2E_BASE_URL: use a server that is already running.
 * - E2E_SERVER=start: `next start` on a production build made with
 *   `VIZ_GALLERY=1 yarn build` (the gallery 404s in production otherwise).
 * - default: `next dev`.
 * The port defaults to 3417 (E2E_PORT). The app needs its usual env
 * (DATABASE_URL and friends, dummy values are enough) even though the dev
 * pages never query it.
 */
const port = Number(process.env.E2E_PORT ?? 3417)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`
const mode = process.env.E2E_SERVER === 'start' ? 'start' : 'dev'

export default defineConfig({
  testDir: 'e2e',
  testIgnore: ['**/stress/**', '**/motion/r1/**', '**/motion/evidence.spec.ts'],
  outputDir: 'test-results/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Baselines come from one Linux image (see visual.spec.ts): identical
    // renders, so any changed pixel is a change. `threshold` absorbs only
    // sub-perceptual antialiasing noise inside a pixel.
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.1 },
  },
  snapshotPathTemplate: '{testDir}/gates/__screenshots__/{platform}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'test-results/e2e-report' }]] : [['list']],
  use: {
    baseURL,
    colorScheme: 'dark',
    // Production builds strip data-testid (next.config.mjs), so the shell
    // exposes its parts as data-viz-part.
    testIdAttribute: 'data-viz-part',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'functional', testMatch: /viz-[\w-]+\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } },
    { name: 'gates', testMatch: /gates\/(contrast|consistency)\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } },
    { name: 'visual', testMatch: /gates\/visual\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } },
    { name: 'motion', testMatch: /motion\/[\w-]+\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next ${mode} --hostname 127.0.0.1 --port ${port}`,
        url: `${baseURL}/dev/visualizations`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
