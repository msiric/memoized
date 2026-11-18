import { expect, test, type Page } from '@playwright/test'
import { ssrDescriptor } from '../../src/components/visualizations/engines/ssr-stream/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'

/**
 * The streaming-SSR step-through (wave 4E) across the tier's configs, as
 * the flagships are: each lesson group's presets, every step, walked with
 * checkpoints answered right, wrong and skipped; every control hovered; and
 * the print rendering through the same detectors. Strict by default.
 */

const ANSWERS = answersOf(ssrDescriptor.presets)
const ID = 'ssr-stream'
/** The app is the visual's own: every preset is walked everywhere. */
const PRESETS = ssrDescriptor.presets.map((p) => p.id)

async function hoverPass(page: Page, rec: Recorder, scope: string, visual: string) {
  const n = await page.evaluate((s) => {
    const root = document.querySelector(s)!
    const ctl = [...root.querySelectorAll('button, [role="radio"], [role="slider"], summary, select')].filter(
      (e) => (e as HTMLElement).getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible',
    )
    ctl.forEach((e, i) => e.setAttribute('data-stress-hover', String(i)))
    return ctl.length
  }, scope)
  for (let i = 0; i < n; i++) {
    const el = page.locator(`${scope} [data-stress-hover="${i}"]`)
    const label = await el.evaluate((e) => (e.getAttribute('aria-label') ?? e.textContent ?? e.tagName).trim().slice(0, 24))
    try {
      await el.hover({ timeout: 2000 })
    } catch {
      continue
    }
    await rec.check(page, scope, visual, `hover ${label}`, {}, `${visual} | hover`)
  }
  await page.mouse.move(0, 0)
}

for (const c of activeConfigs()) {
  test(`ssr stream @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'ssr-stream')
    let fails: Row[] = []
    try {
      for (const preset of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?ssr=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `ssr-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `ssr-stream ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `ssr-stream ${preset}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      for (const preset of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?ssr=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `pssr-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `ssr-stream ${preset} print`, 'start', {}, `ssr-stream ${preset} | print`)
      }
      await page.emulateMedia({ media: 'screen' })
    } finally {
      fails = failing(rec.rows.filter((r) => r.detector !== 'text-zoom'), (id, n) =>
        test.info().annotations.push({ type: `pending decision (${id})`, description: `${c.name}: ${n} rows` }),
      )
      rec.write()
      await ctx.close()
    }
    if (gated(c)) expect(fails.map((r) => `${r.detector} ${r.visual} [${r.state}] ${r.msg}`)).toEqual([])
  })
}
