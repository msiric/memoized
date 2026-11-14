import fs from 'node:fs'
import path from 'node:path'
import type { Browser, BrowserContext, Page } from '@playwright/test'

/** R1-B probe helpers (uncommitted audit code). */
export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
export const SHOTS = process.env.R1_SHOTS ?? path.join(process.cwd(), 'test-results', 'r1', 'shots')
export const RESULTS = process.env.R1_RESULTS ?? path.join(process.cwd(), 'test-results', 'r1', 'results')
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(RESULTS, { recursive: true })

export type Size = { w: number; h: number; dsf?: number; name?: string }
export const sizeName = (s: Size) => s.name ?? `${s.w}x${s.h}`

export async function ctxFor(
  browser: Browser,
  s: Size,
  opts: { reduce?: boolean; js?: boolean } = {},
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: s.dsf ?? 1,
    reducedMotion: opts.reduce ? 'reduce' : 'no-preference',
    colorScheme: 'dark',
    javaScriptEnabled: opts.js ?? true,
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

/** Opens the gallery and waits for one visual's engine to be live. */
export async function openViz(page: Page, viz: string, url = `${BASE}/dev/visualizations`) {
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const mount = page.locator(`[data-viz="${viz}"]`).first()
  await mount.scrollIntoViewIfNeeded()
  await mount.hover({ position: { x: 2, y: 2 } }).catch(() => {})
  await page.waitForSelector(`[data-viz="${viz}"] section[data-viz-frame][data-viz-interactive="true"]`, {
    timeout: 30_000,
  })
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  return `[data-viz="${viz}"] section[data-viz-frame]`
}

export async function shot(page: Page, selector: string, file: string, pad = 12) {
  const box = await page.evaluate(
    ([sel, pad]) => {
      const el = document.querySelector(sel as string)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: Math.max(0, r.left + scrollX - (pad as number)),
        y: Math.max(0, r.top + scrollY - (pad as number)),
        width: Math.min(document.documentElement.scrollWidth, r.width + 2 * (pad as number)),
        height: r.height + 2 * (pad as number),
      }
    },
    [selector, pad] as const,
  )
  if (!box) return null
  await page.screenshot({ path: path.join(SHOTS, file), clip: box, fullPage: true })
  return file
}

export function writeResult(name: string, data: unknown) {
  fs.writeFileSync(path.join(RESULTS, `${name}.json`), JSON.stringify(data, null, 1))
}

/** Clicks Next with a gap longer than the burst window, so every step is paced. */
export async function pacedClick(page: Page, selector: string, gap = 420) {
  await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement)?.click(), selector)
  await page.waitForTimeout(gap)
}
