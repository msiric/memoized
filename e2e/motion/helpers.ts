import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { RECORDER } from './recorder'
import { flagsFor, motionsAfter, type Capture, type ElementMotion } from './analyze'

export const GALLERY = '/dev/visualizations'
export const EL = '[data-viz="event-loop"] section'
export const LK = '[data-viz="list-keys"] section'

/** Where JSON reports and frame strips go. Override with MOTION_OUT. */
export const OUT = process.env.MOTION_OUT ?? path.join('e2e', 'motion', 'out')

export function save(name: string, data: unknown) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2))
}

export async function openGallery(
  page: Page,
  opts: { width?: number; height?: number; query?: string; reduced?: boolean } = {},
) {
  await page.addInitScript(RECORDER)
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: opts.width ?? 1024, height: opts.height ?? 900 })
  await page.goto(GALLERY + (opts.query ?? ''))
  await expect(page.locator(`${EL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

export async function hydrateListKeys(page: Page) {
  await page.locator('[data-viz="list-keys"]').scrollIntoViewIfNeeded()
  await expect(page.locator(`${LK}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

export async function startRec(page: Page, root: string) {
  await page.evaluate((sel) => (window as any).__vizRec.start(sel), root)
}
export async function mark(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__vizRec.mark())
}
export async function stopRec(page: Page): Promise<Capture> {
  return page.evaluate(() => (window as any).__vizRec.stop())
}

/** Records one command: starts the recorder, waits a frame, runs `act`, records `ms`. */
export async function recordAction(page: Page, root: string, act: () => Promise<unknown>, ms = 700) {
  await startRec(page, root)
  await page.waitForTimeout(80)
  const at = await mark(page)
  await act()
  await page.waitForTimeout(ms)
  const cap = await stopRec(page)
  return { cap, at, motions: motionsAfter(cap, at) }
}

/** Elements that tweened an own property (opacity, translate, path) after the command. */
export function animated(ms: ElementMotion[]) {
  return ms
    .map((e) => ({ ...e, props: e.props.filter((p) => p.intermediates > 0 && p.prop !== 'x' && p.prop !== 'y' && p.prop !== 'eff') }))
    .filter((e) => e.props.length)
}

export function summarize(ms: ElementMotion[], reduced = false) {
  return {
    animated: animated(ms).map((e) => ({
      label: e.label,
      mounted: e.mounted,
      removed: e.removed,
      props: e.props.map((p) => ({
        prop: p.prop,
        start: p.start,
        end: p.end,
        delay: p.delay,
        duration: p.duration,
        intermediates: p.intermediates,
        overshootPx: p.overshootPx,
        maxStepShare: p.maxStepShare,
        monotonic: p.monotonic,
      })),
    })),
    flags: flagsFor(ms, { reduced }),
  }
}

export async function activeInfo(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    if (!a || a === document.body) return 'body'
    const viz = a.closest('[data-viz]')?.getAttribute('data-viz') ?? 'outside'
    return `${viz}:${a.tagName.toLowerCase()}[${a.getAttribute('role') ?? ''}]${a.getAttribute('aria-label') ?? a.getAttribute('data-viz-focus') ?? a.textContent?.trim().slice(0, 20)}`
  })
}

/** Web Animations started inside the frame (CSS transitions, FLIP, accelerated opacity). */
export function animsOf(cap: Capture) {
  return cap.anims.map((a) => ({
    t: a.t,
    label: a.label.slice(0, 80),
    kind: a.kind,
    name: a.name,
    duration: a.duration,
    easing: a.easing,
    from: a.from,
    to: a.to,
  }))
}

// ---------------------------------------------------------------------------
// Strict mode (VIZ-H WS2). MOTION_STRICT=1 turns the recorded facts into
// assertions for the rules the shell implements; without it the specs only
// record. Failures are soft, so one run lists every violation.
// ---------------------------------------------------------------------------

export const STRICT = process.env.MOTION_STRICT === '1'

/** Fails (softly) with the list of problems, in strict mode only. */
export function strictCheck(name: string, problems: string[]) {
  if (STRICT) expect.soft(problems, name).toEqual([])
}

/** An element of a visual's designed reveal (`data-viz-reveal`, D21). */
export const REVEAL = /\bviz-reveal=(\S+)/
const STAGE_REGION = /\bin=(stack|host|micro|tasks|console)\b/
const GLYPH_KEY = /\b(?:glyph|flip-id|chip)=(\S+)|\bout=(\d+)/

/** The stage glyph an element belongs to (`then`, `out-2`), or null for chrome. */
export function glyphKey(label: string): string | null {
  // The reveal (D21) is the one explicit exception to the budget; it is
  // asserted on its own (reveal.spec.ts).
  if (REVEAL.test(label)) return null
  if (!STAGE_REGION.test(label)) return null
  const m = label.match(GLYPH_KEY)
  if (!m) return null
  return m[1] ?? `out-${m[2]}`
}

/** Distinct stage glyphs that tweened opacity or translate (spec §4 rule 1 counts these). */
export function animatedGlyphs(ms: ElementMotion[]): string[] {
  const keys = new Set<string>()
  for (const e of animated(ms)) {
    const k = glyphKey(e.label)
    if (k && e.props.some((p) => ['op', 'tx', 'ty'].includes(p.prop))) keys.add(k)
  }
  return [...keys].sort()
}
