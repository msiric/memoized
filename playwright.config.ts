import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end checks for lesson visualizations (VIZ-01 spec §7), run with
 * `yarn test:e2e`. Not part of CI yet.
 *
 * Server, in order of precedence:
 * - E2E_BASE_URL: use a server that is already running.
 * - E2E_SERVER=start: `next start` on a production build made with
 *   `VIZ_GALLERY=1 yarn build` (the gallery 404s in production otherwise).
 * - default: `next dev`.
 * The port defaults to 3417 (E2E_PORT). The app needs its usual env
 * (DATABASE_URL and friends) even though the gallery does not query it.
 */
const port = Number(process.env.E2E_PORT ?? 3417)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`
const mode = process.env.E2E_SERVER === 'start' ? 'start' : 'dev'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    colorScheme: 'dark',
    // Production builds strip data-testid (next.config.mjs), so the shell
    // exposes its parts as data-viz-part.
    testIdAttribute: 'data-viz-part',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } }],
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
