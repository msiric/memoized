/**
 * The ssr-stream recorder (spec P6, "truthful by construction"): runs
 * `run.ts` in a fresh Node 24 process (React 19 through the aliases, the
 * browser part in Playwright's Chromium) and returns its recording. The
 * app is the visual's own (`app.ts`), so no content checkout is needed.
 *
 * Node-only: the truth test and `yarn viz:ssr` import this, the browser never does.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import type { SsrRecording } from './types'

export function recordSsr(): SsrRecording & { runtime: string } {
  const run = spawnSync(process.execPath, ['--no-warnings', '--import', 'tsx', path.join(__dirname, 'run.ts')], {
    encoding: 'utf8',
    timeout: 120_000,
    cwd: path.join(__dirname, '..', '..', '..', '..', '..', '..'),
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`ssr-stream recorder exited with ${run.status}: ${run.stderr}`)
  return JSON.parse(run.stdout)
}

/** True when Playwright's Chromium is installed here (CI's unit job may not have it). */
export function hasChromium(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright') as { chromium: { executablePath: () => string } }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:fs').existsSync(chromium.executablePath())
  } catch {
    return false
  }
}
