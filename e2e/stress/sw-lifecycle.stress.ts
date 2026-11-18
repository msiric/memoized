import { expect, test, type Page } from '@playwright/test'
import { swDescriptor } from '../../src/components/visualizations/engines/sw-lifecycle/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'

/**
 * The service-worker lifecycle step-through (wave 4E) across the tier's configs, as
 * the flagships are: each lesson group's presets, every step, walked with
 * checkpoints answered right, wrong and skipped; every control hovered; and
 * the print rendering through the same detectors. Strict by default.
 */

const ANSWERS = answersOf(swDescriptor.presets)
const ID = 'sw-lifecycle'
/** The visual's own worker: every preset is walked, on CI too. */
const PRESETS = swDescriptor.presets.map((p) => p.id)

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
  test(`sw lifecycle @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'sw-lifecycle')
    let fails: Row[] = []
    try {
      for (const preset of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?swl=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `swl-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `sw-lifecycle ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `sw-lifecycle ${preset}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      for (const preset of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?swl=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `pswl-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `sw-lifecycle ${preset} print`, 'start', {}, `sw-lifecycle ${preset} | print`)
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
